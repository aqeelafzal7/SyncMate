import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  HelpCircle, 
  Bot, 
  User, 
  Compass, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';
import { getUserCurrentCoordinates } from '../lib/contextService';

interface OnboardingChatProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingChat: React.FC<OnboardingChatProps> = ({
  initialProfile,
  onComplete,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Extracted draft profile state
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: initialProfile?.name || '',
    occupation: initialProfile?.occupation || '',
    goals: initialProfile?.goals || '',
    religion: initialProfile?.religion || 'None',
    location: initialProfile?.location,
    onboarded: false,
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

I am thrilled to meet you! My job is to take care of your schedule, optimize your focus blocks, and proactively keep your daily goals on track.

To tailor your experience, I'd love to learn a bit about you. 

First, **what is your full name**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, []);

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
      // Send chat history to backend Gemini endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'onboarding',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            currentDraftProfile: profile,
            isLocationSet: !!profile.location
          }
        }),
      });

      if (!res.ok) {
        throw new Error('Chat API returned error');
      }

      const data = await res.json();
      const replyText = data.reply || 'I am processing your input.';

      // Inspect response text or parse heuristics to update profile fields
      updateProfileFromConversation(textToSend, replyText);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      console.error('Onboarding chat error:', err);
      // Fallback local intelligent response
      const fallbackReply = generateFallbackResponse(textToSend);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Extract user info from inputs to build profile state
  const updateProfileFromConversation = (userText: string, aiReply: string) => {
    setProfile((prev) => {
      const updated = { ...prev };

      // 1. Name
      if (!updated.name) {
        // Extract first reasonable string
        const cleanName = userText.replace(/my name is|i am|call me/gi, '').trim();
        if (cleanName.length > 0) updated.name = cleanName;
      } 
      // 2. Occupation
      else if (!updated.occupation) {
        updated.occupation = userText;
      }
      // 3. Goals
      else if (!updated.goals) {
        updated.goals = userText;
      }
      // 4. Religion
      else if (updated.religion === 'None') {
        const lower = userText.toLowerCase();
        if (lower.includes('muslim') || lower.includes('islam')) {
          updated.religion = 'Muslim';
        } else if (lower.includes('christian')) {
          updated.religion = 'Christian';
        } else if (lower.includes('jewish') || lower.includes('jew')) {
          updated.religion = 'Jewish';
        } else if (lower.includes('hindu')) {
          updated.religion = 'Hindu';
        } else if (lower.includes('buddhist')) {
          updated.religion = 'Buddhist';
        } else {
          updated.religion = 'None';
        }
      }

      return updated;
    });
  };

  const generateFallbackResponse = (userText: string): string => {
    const lower = userText.toLowerCase();

    if (!profile.name) {
      return `Pleased to meet you, **${userText}**! What is your current occupation or primary study focus?`;
    }
    if (!profile.occupation) {
      return `Got it! Working as **${userText}**. What are your key long-term goals or main projects right now? (e.g. "Preparing for exams", "Building a mobile app", "Organizing a poster competition")`;
    }
    if (!profile.goals) {
      if (lower.includes('poster') || lower.includes('competition') || lower.includes('event') || lower.length < 15) {
        return `Interesting goal! To help me schedule this accurately: **Are you organizing or participating in this?** What key dates or deliverables are involved?`;
      }
      return `Understood! To ensure I respect your daily rhythms, **what is your religion or spiritual preference?** (If Muslim, I will automatically lock your timeline around the 5 daily prayer anchors).`;
    }
    if (profile.religion === 'None') {
      if (lower.includes('muslim') || lower.includes('islam')) {
        return `SubhanAllah! I will set your schedule to strictly anchor around the 5 daily prayer times (Fajr, Dhuhr, Asr, Maghrib, and Isha) based on your dynamic location coordinates.

Next step: **Please grant GPS Location access** using the button below so I can compute accurate local prayer timings and weather!`;
      }
      return `Thank you! I have configured your profile preferences.

Final step: **Please grant GPS Location access** using the button below so I can compute accurate local context and sunrise/sunset timings!`;
    }

    return `Awesome! Everything is set up. Click **"Complete Onboarding"** to jump into your autonomous secretary dashboard!`;
  };

  // Fetch dynamic location via Geolocation API
  const handleFetchLocation = async () => {
    setGeoLoading(true);
    try {
      const loc = await getUserCurrentCoordinates();
      setProfile((prev) => ({ ...prev, location: loc }));

      const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📍 **Dynamic Coordinates Acquired!**
Lat: \`${loc.latitude.toFixed(4)}\`, Lng: \`${loc.longitude.toFixed(4)}\`
City: **${loc.city}**

Your local context, prayer anchors, and live weather summaries are fully integrated! You are ready to enter SyncMate.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, sysMsg]);
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    const finalProfile: UserProfile = {
      uid: initialProfile?.uid || `user_${Date.now()}`,
      email: initialProfile?.email || 'user@syncmate.ai',
      name: profile.name || 'User',
      occupation: profile.occupation || 'Professional',
      goals: profile.goals || 'Goal setting',
      religion: profile.religion || 'None',
      location: profile.location || {
        latitude: 21.4225,
        longitude: 39.8262,
        city: 'Default Coordinates',
        updatedAt: new Date().toISOString()
      },
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
              <span>SyncMate is reflecting & organizing questions...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Dynamic Location Trigger Box */}
        {!profile.location && (
          <div className="mx-4 mb-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Fetch browser GPS coordinates for dynamic location & prayer anchors</span>
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
              placeholder="Answer SyncMate or ask for suggestions..."
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
            As you chat, SyncMate structures your profile details in real-time inside Cloud Firestore.
          </p>

          <div className="space-y-4">
            
            {/* Name */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile.name || <span className="text-slate-400 italic">Waiting for input...</span>}
              </span>
            </div>

            {/* Occupation */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Occupation / Studies
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile.occupation || <span className="text-slate-400 italic">Waiting for input...</span>}
              </span>
            </div>

            {/* Long term goals */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Goals & Projects
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile.goals || <span className="text-slate-400 italic">Waiting for input...</span>}
              </span>
            </div>

            {/* Religion & Schedule Anchor Rules */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Religion Logic
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
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
                  <span className="text-[10px] text-slate-400">
                    ({profile.location.latitude.toFixed(2)}, {profile.location.longitude.toFixed(2)})
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleFetchLocation}
                  className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Click to detect GPS Location</span>
                </button>
              )}
            </div>

          </div>

          <button
            onClick={handleFinishOnboarding}
            className="mt-6 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
          >
            <span>Complete Onboarding & Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>
      </div>

    </div>
  );
};
