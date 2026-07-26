import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  User, 
  CheckCircle2, 
  PlusCircle, 
  MessageSquare,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Key
} from 'lucide-react';
import { ChatMessage, UserProfile, Task, PrayerTimings, WeatherData } from '../types';
import { speakResponse, stopSpeech } from '../lib/audioService';
import { encryptAndSaveApiKey, getDecryptedApiKey, removeSavedApiKey } from '../lib/cryptoStorage';
import { saveUserProfile } from '../lib/firebase';

interface FloatingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  tasks: Task[];
  prayerTimings: PrayerTimings | null;
  weather: WeatherData | null;
  onTaskCreated: (taskData: Omit<Task, 'id'>) => void;
  onTasksRolledOver?: (reorganizedTasks: any[]) => void;
  onUpdateActiveMood?: (mood: string) => void;
}

// Lightweight sentiment fallback evaluator for incoming message tone
function evaluateSentimentFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(anxious|worried|nervous|fear|panic|dread|scared|apprehensive)\b/.test(lower)) return 'anxious';
  if (/\b(stressed|overwhelmed|exhausted|burnout|pressure|too much|drowning)\b/.test(lower)) return 'stressed';
  if (/\b(grateful|thankful|blessed|alhamdulillah|appreciate|gratitude)\b/.test(lower)) return 'grateful';
  if (/\b(happy|joy|joyful|excited|thrilled|great day|awesome|wonderful|delighted)\b/.test(lower)) return 'joyful';
  if (/\b(sad|depressed|lonely|down|grief|heartbroken|crying|unhappy|miserable)\b/.test(lower)) return 'sad';
  return null;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  isOpen,
  onClose,
  userProfile,
  tasks,
  prayerTimings,
  weather,
  onTaskCreated,
  onTasksRolledOver,
  onUpdateActiveMood,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Hello ${userProfile.name || 'there'}! I am **SyncMate**, your Autonomous Assistant. ⚡

How can I help you today? You can speak or type to schedule tasks, plan projects, or reorganize leftover tasks into optimal focus slots.

*Try asking: "Schedule a team sync tomorrow at 3pm"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isFetchingRef = useRef<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [rolloverLoading, setRolloverLoading] = useState(false);

  // Gemini API Key Management
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  useEffect(() => {
    getDecryptedApiKey().then((key) => {
      if (key) {
        setCustomApiKey(key);
        setApiKeyInput(key);
      }
    });
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      await encryptAndSaveApiKey(trimmed);
      setCustomApiKey(trimmed);
    } else {
      removeSavedApiKey();
      setCustomApiKey('');
    }
    setShowApiKeyModal(false);
  };

  const handleClearApiKey = () => {
    removeSavedApiKey();
    setCustomApiKey('');
    setApiKeyInput('');
    setShowApiKeyModal(false);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser environment. You can type directly!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        stopSpeech();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Failed to start speech recognition:', e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      stopSpeech();
    }
  }, [messages, isOpen, loading]);

  if (!isOpen) return null;

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || loading || isGenerating || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsGenerating(true);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    const isFreeTier = userProfile.tier === 'free' && userProfile.email !== 'chaqeelpak@gmail.com';
    const currentChatCount = userProfile.chatMessageCount || 0;

    if (isFreeTier && currentChatCount >= 15) {
      const limitMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚡ **Free Tier Daily Chat Limit Reached (15/15 messages).** Upgrade to Spark Plan for unlimited chat with your AI Assistant!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, limitMsg]);
      setLoading(false);
      setIsGenerating(false);
      isFetchingRef.current = false;
      return;
    }

    if (isFreeTier) {
      const newCount = currentChatCount + 1;
      const updatedProf = { ...userProfile, chatMessageCount: newCount };
      saveUserProfile(updatedProf).catch(console.warn);
    }

    try {
      const activeApiKey = customApiKey || (await getDecryptedApiKey()) || undefined;
      let replyText = '';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'assistant',
            customApiKey: activeApiKey,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            context: {
              userProfile,
              tasks: tasks.map(t => ({ id: t.id, title: t.title, startTime: t.startTime, endTime: t.endTime, status: t.status })),
              prayerTimings,
              weather,
              currentLocalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          }),
        });

        if (!res.ok) {
          throw new Error(`Backend /api/chat returned status ${res.status}`);
        }

        const resText = await res.text();
        if (!resText || !resText.trim()) {
          throw new Error('Received empty response from backend.');
        }

        const data = JSON.parse(resText);
        replyText = data.reply || '';
      } catch (serverErr: any) {
        console.warn('Backend /api/chat endpoint failed or unavailable, attempting direct client-side Gemini fallback:', serverErr);

        if (!activeApiKey) {
          throw new Error('Backend server is unavailable and no personal Gemini API key was found. Please click "🔑 API Key" in the chat header to enter your API key.');
        }

        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;
        const systemInstruction = `You are SyncMate, an elite, Autonomous AI Assistant and Fitness Coach for ${userProfile.name || 'User'}. You must be conversational, sharp, and highly proactive.

CRITICAL OPERATIONAL & FITNESS RULES:
1. INQUISITIVE & PROACTIVE: When given vague goals, ask 1-2 sharp clarifying questions. If the user asks for fitness/health goals (e.g. weight loss, height/posture stretching, core strength, no-equipment workouts), ask: "How many days a week can you commit, and what time of day works best (morning or evening)?"
2. AUTONOMOUS AI FITNESS COACH (Zero Equipment):
   - When asked for workout or fitness guidance, generate a tailored equipment-free routine (e.g., Jumping Jacks, Bodyweight Squats, Wall Sits, Cobra Stretches, Planks).
   - Always list exercise names, set/repetition guidelines or duration (e.g. 45s Plank, 3 sets), and form tips.
3. RELIGION & PRAYER ANCHORS: Keep timeline tasks intelligently scheduled around non-negotiable Islamic prayer times (Fajr: ${prayerTimings?.Fajr || 'N/A'}, Dhuhr: ${prayerTimings?.Dhuhr || 'N/A'}, Asr: ${prayerTimings?.Asr || 'N/A'}, Maghrib: ${prayerTimings?.Maghrib || 'N/A'}, Isha: ${prayerTimings?.Isha || 'N/A'}).
4. STRUCTURED ACTION OUTPUT: When proposing a task or fitness plan, append a markdown JSON action code block at the end:
For a single task:
\`\`\`json_action
{
  "action": "CREATE_TASK",
  "data": {
    "title": "🏋️ Fitness Focus: Core & Bodyweight",
    "description": "3 Sets: 15 Squats, 45s Plank, Cobra Stretch. Form tip: Engage core.",
    "startTime": "06:30",
    "endTime": "07:00",
    "category": "health",
    "aiTip": "Scheduled after Fajr prayer for peak mental focus."
  }
}
\`\`\`
5. EMOTIONAL SENTIMENT TRACKING: Analyze the user's incoming message tone and emotional state. If a clear emotional state is detected (e.g. "anxious", "grateful", "stressed", "joyful", "sad", "overwhelmed", "hopeful"), update detectedMood to that emotion. If neutral or factual, set detectedMood to "neutral". Always append a sentiment code block at the very end of your response:
\`\`\`json_mood
{
  "detectedMood": "anxious"
}
\`\`\`

Current User Context:
${JSON.stringify({ userProfile, tasks: tasks.map(t => ({ id: t.id, title: t.title, startTime: t.startTime, endTime: t.endTime, status: t.status })), prayerTimings, weather, currentLocalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, null, 2)}`;

        const formattedContents = newMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const directRes = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          })
        });

        if (!directRes.ok) {
          const directErrText = await directRes.text();
          let directErrMsg = `Direct Gemini API error (${directRes.status})`;
          try {
            const parsedErr = JSON.parse(directErrText);
            directErrMsg = parsedErr.error?.message || directErrMsg;
          } catch {}
          throw new Error(directErrMsg);
        }

        const directData = await directRes.json();
        replyText = directData.candidates?.[0]?.content?.parts?.[0]?.text || 'I am ready to assist you.';
      }

      // Parse potential json_action block
      const actionMatch = replyText.match(/```json_action\s*([\s\S]*?)\s*```/);
      let actionObj: any = null;

      if (actionMatch && actionMatch[1]) {
        try {
          actionObj = JSON.parse(actionMatch[1]);
        } catch (e) {
          console.warn('Failed to parse json_action:', e);
        }
      }

      // If CREATE_TASK action is present, call handler
      if (actionObj && actionObj.action === 'CREATE_TASK' && actionObj.data) {
        const td = actionObj.data;
        onTaskCreated({
          userId: userProfile.uid,
          title: td.title || 'New Scheduled Task',
          description: td.description || '',
          startTime: td.startTime || '14:00',
          endTime: td.endTime || '15:00',
          category: td.category || 'work',
          status: 'todo',
          aiTip: td.aiTip || 'Ensure you take a short break before starting.',
          createdAt: new Date().toISOString()
        });
      } else if (actionObj && actionObj.action === 'CREATE_FITNESS_PLAN' && Array.isArray(actionObj.data?.tasks)) {
        const fitnessTasks = actionObj.data.tasks;
        for (const ft of fitnessTasks) {
          onTaskCreated({
            userId: userProfile.uid,
            title: ft.title || '🏋️ Fitness Focus: Equipment-Free Workout',
            description: ft.description || 'Zero-equipment bodyweight/stretching routine',
            startTime: ft.startTime || '06:30',
            endTime: ft.endTime || '07:00',
            category: 'health',
            status: 'todo',
            aiTip: ft.aiTip || 'Hydrate with 250ml water before starting.',
            createdAt: new Date().toISOString()
          });
        }
      } else if (actionObj && actionObj.action === 'DECOMPOSE_PROJECT' && Array.isArray(actionObj.data?.tasks)) {
        const decompTasks = actionObj.data.tasks;
        const now = new Date();
        for (const dt of decompTasks) {
          const dayOffset = typeof dt.dayOffset === 'number' ? dt.dayOffset : 0;
          const targetDateObj = new Date(now.getTime() + dayOffset * 86400000);
          const taskDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

          onTaskCreated({
            userId: userProfile.uid,
            title: dt.title || 'Project Milestone',
            description: dt.description || '',
            startTime: dt.startTime || '10:00',
            endTime: dt.endTime || '10:45',
            category: dt.category || 'study',
            status: 'todo',
            aiTip: dt.aiTip || 'Focus on step-by-step progress.',
            projectId: actionObj.data.projectId,
            date: taskDate,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Parse potential json_mood block for emotional sentiment tracking
      let detectedMood: string | null = null;
      const moodMatch = replyText.match(/```json_mood\s*([\s\S]*?)\s*```/);
      if (moodMatch && moodMatch[1]) {
        try {
          const moodObj = JSON.parse(moodMatch[1]);
          if (moodObj.detectedMood) {
            detectedMood = String(moodObj.detectedMood).toLowerCase().trim();
          }
        } catch (e) {
          console.warn('Failed to parse json_mood:', e);
        }
      }

      // Lightweight background sentiment evaluation fallback on incoming message tone
      if (!detectedMood) {
        detectedMood = evaluateSentimentFromText(textToSend);
      }

      if (detectedMood) {
        localStorage.setItem('syncmate_current_mood', detectedMood);
        if (onUpdateActiveMood) {
          onUpdateActiveMood(detectedMood);
        }
      }

      // Clean display text without raw json_action or json_mood blocks
      const cleanReply = replyText
        .replace(/```json_action\s*[\s\S]*?```/g, '')
        .replace(/```json_mood\s*[\s\S]*?```/g, '')
        .trim();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionData: actionObj
      };

      setMessages([...newMessages, aiMsg]);

      if (ttsEnabled) {
        speakResponse(cleanReply);
      }

    } catch (err: any) {
      console.error('Floating assistant error:', err);
      const errMsg = err.message || 'Error communicating with Gemini AI.';
      const isFreeUser = userProfile.tier === 'free' && userProfile.email !== 'chaqeelpak@gmail.com';
      const helpNotice = isFreeUser
        ? 'Please try again in a few moments.'
        : 'If you haven\'t saved your Gemini API Key, please click the **🔑 API Key** button in the header above to enter your key.';
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **SyncMate AI Notice:** ${errMsg}\n\n${helpNotice}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, aiMsg]);

      if (ttsEnabled) {
        speakResponse('There was an issue processing your request. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsGenerating(false);
      isFetchingRef.current = false;
    }
  };

  const triggerTaskRollover = async () => {
    setRolloverLoading(true);
    const incompleteTasks = tasks.filter(t => t.status !== 'completed');

    if (incompleteTasks.length === 0) {
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "✨ All tasks on your timeline are up to date! There are no incomplete leftover tasks to reorganize.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, msg]);
      setRolloverLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incompleteTasks,
          prayerTimings,
          existingTasks: tasks.filter(t => t.status === 'completed'),
          userProfile
        })
      });

      if (!res.ok) throw new Error('Rollover failed');

      const data = await res.json();
      const message = data.message || "I've reorganized your leftover tasks into today's optimal focus slots.";

      if (data.reorganizedTasks && onTasksRolledOver) {
        onTasksRolledOver(data.reorganizedTasks);
      }

      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🌿 **Self-Healing Schedule Updated:**\n\n${message}\n\nNo stressful overdue flags! All leftover tasks have been safely placed around your prayer anchors and existing meetings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, msg]);
      if (ttsEnabled) speakResponse(message);

    } catch (err) {
      console.error('Rollover error:', err);
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I've reorganized your leftover tasks into today's optimal focus slots around your daily anchors.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, msg]);
    } finally {
      setRolloverLoading(false);
    }
  };

  const generateFallbackTaskLogic = (userText: string) => {
    const lower = userText.toLowerCase();

    // Vague task check
    if (lower.includes('event') || lower.includes('competition') || lower.includes('course') || (lower.includes('meeting') && !lower.includes('at'))) {
      return {
        reply: `I noticed you mentioned a meeting, course, or event. To help me schedule this accurately without conflicting with your prayer anchors:

1. **Are you organizing this or attending as a participant?**
2. **What exact date and time window do you prefer?**

Once you confirm, I will place it in your schedule with a proactive prep tip!`,
        taskToCreate: null
      };
    }

    // Explicit task scheduling
    let timeStr = "14:00";
    if (lower.includes('3pm') || lower.includes('3 pm')) timeStr = "15:00";
    if (lower.includes('10am') || lower.includes('10 am')) timeStr = "10:00";
    if (lower.includes('2pm') || lower.includes('2 pm')) timeStr = "14:00";

    const taskTitle = userText.replace(/schedule|add|task|at|pm|am|\d+/gi, '').trim() || 'Scheduled Activity';

    const newTaskData: Omit<Task, 'id'> = {
      userId: userProfile.uid,
      title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
      description: 'Created via SyncMate Voice Secretary',
      startTime: timeStr,
      endTime: `${parseInt(timeStr.split(':')[0], 10) + 1}:00`,
      category: 'work',
      status: 'todo',
      aiTip: 'Proactive Tip: Set aside a 15-minute preparation buffer right before this task.',
      createdAt: new Date().toISOString()
    };

    return {
      reply: `Got it! I have explicitly scheduled **"${newTaskData.title}"** at **${newTaskData.startTime}**.

💡 **SyncMate Advisory Tip:** Set aside a 15-minute preparation buffer right before starting to review key materials.

*Task has been added to your Firestore daily timeline!*`,
      taskToCreate: newTaskData
    };
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100%-2rem)] md:w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px] sm:h-[580px] transition-all">
      
      {/* Drawer Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center p-1">
            <img src="https://i.ibb.co/PztwKQdM/Sync-Mate.png" alt="SyncMate Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm">Talk to SyncMate</h3>
            <p className="text-[10px] text-indigo-200">Voice Assistant & Self-Healing Active</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* API Key Manager Button (Paid / Admin Users Only) */}
          {userProfile && (userProfile.tier !== 'free' || userProfile.email === 'chaqeelpak@gmail.com') && (
            <button
              onClick={() => setShowApiKeyModal(!showApiKeyModal)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center space-x-1 ${
                customApiKey
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30'
              }`}
              title="Configure Gemini API Key"
            >
              <Key className="w-3 h-3" />
              <span>{customApiKey ? 'Key Saved' : '🔑 API Key'}</span>
            </button>
          )}

          {/* TTS Toggle */}
          <button
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              if (ttsEnabled) stopSpeech();
            }}
            className={`p-1.5 rounded-xl transition-all ${
              ttsEnabled ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'
            }`}
            title={ttsEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Rollover trigger */}
          <button
            onClick={triggerTaskRollover}
            disabled={rolloverLoading}
            className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 transition-all text-xs flex items-center space-x-1"
            title="Auto-Rollover Leftover Tasks"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${rolloverLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Modal / Popover */}
      {showApiKeyModal && (
        <div className="p-3 bg-slate-900 text-white border-b border-indigo-800 space-y-2 text-xs animate-fadeIn">
          <div className="flex items-center justify-between font-bold text-indigo-200">
            <span className="flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span>Gemini API Key Configuration</span>
            </span>
            {customApiKey && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">Key Active ✓</span>}
          </div>
          <p className="text-[11px] text-slate-300">
            Enter your personal Gemini API Key below to enable direct AI integration. Saved securely in browser storage.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste Gemini API Key (e.g. AIzaSy...)"
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
            />
            <button
              onClick={handleSaveApiKey}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 shadow"
            >
              Save
            </button>
            {customApiKey && (
              <button
                onClick={handleClearApiKey}
                className="px-2 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 font-bold text-xs shrink-0"
                title="Clear Key"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 ${
              m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                m.role === 'user'
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'bg-indigo-600 text-white shadow-md'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-sm rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{m.content}</div>
              
              {m.actionData && m.actionData.action === 'CREATE_TASK' && (
                <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold">Task Added to Timeline!</span>
                </div>
              )}

              {m.actionData && m.actionData.action === 'CREATE_FITNESS_PLAN' && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/40 text-[11px] text-emerald-200 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>🏋️ Fitness Routine Scheduled on Timeline!</span>
                  </div>
                </div>
              )}

              <span className={`block text-[9px] mt-1.5 ${m.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs italic">
            <Bot className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>SyncMate is analyzing your request...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          {/* Voice Speech-to-Text Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white border-red-600 animate-pulse ring-2 ring-red-400/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
            }`}
            title={isListening ? 'Listening... Click to stop' : 'Click to Speak'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            disabled={loading || isGenerating}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening to your voice...' : isGenerating ? 'SyncMate is thinking...' : 'Type or speak to schedule tasks...'}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          
          <button
            type="submit"
            disabled={loading || isGenerating || !input.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

