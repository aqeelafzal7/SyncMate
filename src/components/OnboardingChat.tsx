import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Bot, 
  User, 
  Compass, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { UserProfile, ChatMessage, UserLocation } from '../types';
import { getUserCurrentCoordinates } from '../lib/contextService';

interface OnboardingChatProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingChat: React.FC<OnboardingChatProps> = ({
  initialProfile,
  onComplete,
}) => {
  // Onboarding Step State Machine: 
  // 0: Name, 1: Occupation, 2: Goals, 3: Religion, 4: Complete
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Extracted draft profile state
  const [profile, setProfile] = useState<{
    name: string;
    occupation: string;
    goals: string;
    religion: string;
    dob?: string;
    location?: UserLocation;
  }>({
    name: initialProfile?.name || '',
    occupation: initialProfile?.occupation || '',
    goals: initialProfile?.goals || '',
    religion: initialProfile?.religion || '',
    dob: initialProfile?.dob || '',
    location: initialProfile?.location,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initial Secretary Greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `Hello! I am **SyncMate**, your autonomous AI personal secretary. 🌟

I am thrilled to meet you! My job is to manage your schedule, optimize focus blocks, and proactively align your daily tasks.

To tailor your experience, I'd love to learn a bit about you.

First, **what is your full name**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, []);

  // Step Machine Logic Handler
  const processStepAnswer = (textToSend: string): { responseText: string; nextProfile: typeof profile; nextStep: number } => {
    const nextProf = { ...profile };
    let responseText = '';
    let nextStep = currentStep + 1;
    const lower = textToSend.toLowerCase().trim();

    if (currentStep === 0 || !nextProf.name) {
      // Step 0: Name
      let cleanName = textToSend.replace(/^(my name is|i am|call me|name is)\s+/i, '').trim();
      if (!cleanName) cleanName = textToSend.trim();
      
      // Capitalize name
      cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      nextProf.name = cleanName;
      nextStep = 1;
      responseText = `Awesome to meet you, **${cleanName}**! What are you currently studying or working as?`;
    } 
    else if (currentStep === 1 || !nextProf.occupation) {
      // Step 1: Occupation
      let cleanOcc = textToSend.trim();
      if (lower.includes('biotech') || lower.includes('student of bs') || lower.includes('bs biotech')) {
        cleanOcc = 'BS Biotechnology Student';
      } else if (lower.startsWith('im ') || lower.startsWith('i am ')) {
        cleanOcc = cleanOcc.replace(/^(im|i am)\s+/i, '');
        cleanOcc = cleanOcc.charAt(0).toUpperCase() + cleanOcc.slice(1);
      } else {
        cleanOcc = cleanOcc.charAt(0).toUpperCase() + cleanOcc.slice(1);
      }

      nextProf.occupation = cleanOcc;
      nextStep = 2;
      responseText = `Awesome! Setting your profile as a **${cleanOcc}**. Now, what long-term projects or goals are you working on right now?`;
    } 
    else if (currentStep === 2 || !nextProf.goals) {
      // Step 2: Goals
      if (lower === 'nothing' || lower === 'none' || lower.includes('no goal') || lower === 'no') {
        nextProf.goals = 'General Productivity & Focus';
        nextStep = 3;
        responseText = `No problem! We can set up new goals anytime later. Lastly, what is your religion so I can set up your daily schedule anchors?`;
      } else {
        nextProf.goals = textToSend.trim();
        nextStep = 3;
        responseText = `Got it! Setting your goals. Lastly, what is your religion so I can set up your daily schedule anchors?`;
      }
    } 
    else {
      // Step 3: Religion
      let rel = 'Non-Muslim';
      if (lower.includes('muslim') || lower.includes('islam')) {
        rel = 'Muslim';
      } else if (lower.includes('christian')) {
        rel = 'Christian';
      } else if (lower.includes('jewish') || lower.includes('jew')) {
        rel = 'Jewish';
      } else if (lower.includes('none') || lower.includes('non-muslim')) {
        rel = 'Non-Muslim';
      } else {
        rel = textToSend.trim();
      }

      nextProf.religion = rel;
      nextStep = 4;
      if (rel === 'Muslim') {
        responseText = `Alhamdulillah! I have locked your daily schedule around the 5 daily prayer anchors (Fajr, Dhuhr, Asr, Maghrib, Isha) based on your dynamic location coordinates. You are all set!`;
      } else {
        responseText = `Understood! Your daily schedule is configured for deep work and peak productivity. You are all set!`;
      }
    }

    return { responseText, nextProfile: nextProf, nextStep };
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim();
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
      const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
      
      // Step State Machine calculation
      const { responseText, nextProfile, nextStep } = processStepAnswer(textToSend);

      // Attempt AI call to backend endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'onboarding',
          customApiKey,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            currentDraftProfile: nextProfile,
            currentStep
          }
        }),
      });

      let finalReplyText = responseText;

      if (res.ok) {
        const data = await res.json();
        const rawReply = data.reply || '';

        try {
          let cleanStr = rawReply.trim();
          if (cleanStr.startsWith('```')) {
            cleanStr = cleanStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          const parsed = JSON.parse(cleanStr);
          if (parsed?.chatResponse) {
            finalReplyText = parsed.chatResponse;
          }
          if (parsed?.extractedData) {
            const ext = parsed.extractedData;
            if (ext.name && ext.name !== 'null') nextProfile.name = ext.name;
            if (ext.occupation && ext.occupation !== 'null') nextProfile.occupation = ext.occupation;
            if (ext.goals && ext.goals !== 'null') nextProfile.goals = ext.goals;
            if (ext.religion && ext.religion !== 'null') {
              const relL = String(ext.religion).toLowerCase();
              nextProfile.religion = relL.includes('muslim') || relL.includes('islam') ? 'Muslim' : ext.religion;
            }
          }
        } catch {
          // Keep responseText if JSON parsing wasn't exact
        }
      }

      // Update state and DOM
      setProfile(nextProfile);
      setCurrentStep(nextStep);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      console.warn('Onboarding chat API notice, applying step machine:', err);
      const { responseText, nextProfile, nextStep } = processStepAnswer(textToSend);
      setProfile(nextProfile);
      setCurrentStep(nextStep);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dynamic location via High-Accuracy Geolocation API
  const handleFetchLocation = async () => {
    setGeoLoading(true);
    try {
      const loc = await getUserCurrentCoordinates();
      setProfile((prev) => ({ ...prev, location: loc }));
      
      const locMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📍 **Location Synchronized!** Detected: **${loc.city}** (${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°). Your 5 daily prayer anchors and weather forecasts are now calibrated to this exact city!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, locMsg]);
    } catch (err) {
      console.warn('Failed to fetch location:', err);
    } finally {
      setGeoLoading(false);
    }
  };

  // Auto-fetch location in background on mount if missing
  useEffect(() => {
    if (!profile.location) {
      getUserCurrentCoordinates()
        .then((loc) => {
          if (loc) {
            setProfile((prev) => ({ ...prev, location: loc }));
          }
        })
        .catch(console.warn);
    }
  }, []);

  const handleFinishOnboarding = async () => {
    let finalLocation = profile.location;
    if (!finalLocation) {
      try {
        finalLocation = await getUserCurrentCoordinates();
      } catch {
        finalLocation = {
          latitude: 31.5204,
          longitude: 74.3587,
          city: 'Detected City',
          updatedAt: new Date().toISOString()
        };
      }
    }

    const finalProfile: UserProfile = {
      uid: initialProfile?.uid || `user_${Date.now()}`,
      email: initialProfile?.email || 'user@syncmate.ai',
      name: profile.name || 'SyncMate User',
      occupation: profile.occupation || 'Professional / Student',
      goals: profile.goals || 'Master productivity and focus',
      religion: profile.religion || 'Muslim',
      dob: profile.dob || undefined,
      location: finalLocation,
      onboarded: true,
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onComplete(finalProfile);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left 2 Cols: Interactive Chat UI */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col h-[750px] overflow-hidden">
        
        {/* Chat Header */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Meet Your Autonomous Secretary
              </h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Phase 1: Chat-Based Profile Synchronization
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Secretary Active</span>
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${
                m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                    : 'bg-indigo-600 text-white shadow-md'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
                <span
                  className={`block text-[10px] mt-2 ${
                    m.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs italic">
              <Bot className="w-5 h-5 text-indigo-500 animate-spin" />
              <span>SyncMate is reflecting & organizing your profile...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Dynamic Location Trigger Box */}
        {!profile.location && (
          <div className="mx-4 mb-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Fetch high-accuracy GPS coordinates for location & prayer anchors</span>
            </div>
            <button
              onClick={handleFetchLocation}
              disabled={geoLoading}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 flex items-center space-x-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{geoLoading ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentStep === 0
                  ? "Type your full name (e.g. Muhammad Aqeel)..."
                  : currentStep === 1
                  ? "Type your occupation/studies (e.g. student of bs biotechnology)..."
                  : currentStep === 2
                  ? "Type your goals or 'nothing'..."
                  : "Type 'Muslim', 'Non-Muslim', or your religion..."
              }
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl py-3 px-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md shadow-indigo-600/30 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* Right Col: Live Profile Compilation Card */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl sticky top-24">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Live Profile Synchronizer
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            As you chat, SyncMate structures your profile details in real-time.
          </p>

          <div className="space-y-4">
            
            {/* Name */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </span>
              <span id="profile-name" className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                {profile.name || <span className="text-slate-400 italic font-normal">Waiting for input...</span>}
              </span>
            </div>

            {/* Occupation */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Occupation / Studies
              </span>
              <span id="profile-occupation" className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                {profile.occupation || <span className="text-slate-400 italic font-normal">Waiting for input...</span>}
              </span>
            </div>

            {/* Date of Birth */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                🎂 Date of Birth (Birthday Mode)
              </span>
              <input
                type="date"
                value={profile.dob || ''}
                onChange={(e) => setProfile(p => ({ ...p, dob: e.target.value }))}
                className="mt-1 w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Long term goals */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Goals & Projects
              </span>
              <span id="profile-goals" className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                {profile.goals || <span className="text-slate-400 italic font-normal">Waiting for input...</span>}
              </span>
            </div>

            {/* Religion & Schedule Anchor Rules */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Religion Logic
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span id="profile-religion" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {profile.religion || 'None'}
                </span>
                {profile.religion === 'Muslim' && (
                  <span className="px-2 py-0.5 text-[10px] rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    5 Daily Prayer Anchors Locked
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Coordinates */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Dynamic Coordinates
              </span>
              {profile.location ? (
                <div className="mt-1 text-xs text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-semibold">{profile.location.city}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic block mt-0.5">
                  Not set yet
                </span>
              )}
            </div>

          </div>

          {/* Complete Onboarding Button */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleFinishOnboarding}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
            >
              <span>Finish Onboarding & Enter Timeline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
