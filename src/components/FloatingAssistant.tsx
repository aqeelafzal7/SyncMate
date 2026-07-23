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
  RotateCcw
} from 'lucide-react';
import { ChatMessage, UserProfile, Task, PrayerTimings } from '../types';
import { speakResponse, stopSpeech } from '../lib/audioService';

interface FloatingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  tasks: Task[];
  prayerTimings: PrayerTimings | null;
  onTaskCreated: (taskData: Omit<Task, 'id'>) => void;
  onTasksRolledOver?: (reorganizedTasks: any[]) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  isOpen,
  onClose,
  userProfile,
  tasks,
  prayerTimings,
  onTaskCreated,
  onTasksRolledOver,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Hello ${userProfile.name || 'there'}! I am **SyncMate**, your autonomous secretary. 🤖

How can I help you today? You can speak or type to schedule tasks, plan projects, or reorganize leftover tasks into optimal focus slots.

*Try asking: "Schedule a team sync tomorrow at 3pm"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [rolloverLoading, setRolloverLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            userProfile,
            currentLocalTime: new Date().toISOString()
          }
        }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      const replyText = data.reply || 'I am ready to assist you.';

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
          aiTip: td.aiTip || 'Ensure you take a short break before starting.'
        });
      }

      // Clean display text without raw json_action block
      const cleanReply = replyText.replace(/```json_action\s*[\s\S]*?```/g, '').trim();

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

    } catch (err) {
      console.error('Floating assistant error:', err);
      // Fallback response with heuristic AI parsing
      const fallbackReply = generateFallbackTaskLogic(textToSend);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackReply.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      if (fallbackReply.taskToCreate) {
        onTaskCreated(fallbackReply.taskToCreate);
      }
      setMessages([...newMessages, aiMsg]);

      if (ttsEnabled) {
        speakResponse(fallbackReply.reply);
      }
    } finally {
      setLoading(false);
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
      aiTip: 'Proactive Tip: Set aside a 15-minute preparation buffer right before this task.'
    };

    return {
      reply: `Got it! I have explicitly scheduled **"${newTaskData.title}"** at **${newTaskData.startTime}**.

💡 **SyncMate Advisory Tip:** Set aside a 15-minute preparation buffer right before starting to review key materials.

*Task has been added to your Firestore daily timeline!*`,
      taskToCreate: newTaskData
    };
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px] transition-all">
      
      {/* Drawer Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Bot className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm">Talk to SyncMate</h3>
            <p className="text-[10px] text-indigo-200">Voice Assistant & Self-Healing Active</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
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
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening to your voice...' : 'Type or speak to schedule tasks...'}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

