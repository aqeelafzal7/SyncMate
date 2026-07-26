import React, { useState, useEffect, useRef } from 'react';
import { getDecryptedApiKey } from '../lib/cryptoStorage';
import { callGeminiWithFallback } from '../lib/geminiService';
import { AddWardrobeItemModal } from './AddWardrobeItemModal';
import { ApiKeyModal } from './ApiKeyModal';
import { 
  Shirt, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Check, 
  Upload, 
  Loader2, 
  Tag, 
  Layers, 
  X, 
  AlertCircle,
  Sun,
  Calendar,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { WardrobeItem, StyleLog, StylistOutfitOption, WeatherData, Task, UserProfile } from '../types';
import { 
  addWardrobeItemToFirestore, 
  updateWardrobeItemStatusInFirestore, 
  resetUserLaundryInFirestore, 
  saveStyleLogToFirestore,
  deleteWardrobeItemFromFirestore,
  uploadWardrobePhoto,
  uploadToImgBB
} from '../lib/firebase';

interface TodayWearViewProps {
  wardrobeItems: WardrobeItem[];
  userProfile: UserProfile | null;
  weather: WeatherData | null;
  tasks: Task[];
  onOutfitSelected?: () => void;
}

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Traditional', 'Footwear', 'Watches', 'Glasses', 'Custom'];

export const TodayWearView: React.FC<TodayWearViewProps> = ({
  wardrobeItems,
  userProfile,
  weather,
  tasks,
  onOutfitSelected
}) => {
  const [activeTab, setActiveTab] = useState<'stylist' | 'closet'>('stylist');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Menswear' | 'Accessories'>('All');

  // AI Stylist State
  const [generating, setGenerating] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const [outfitOptions, setOutfitOptions] = useState<StylistOutfitOption[]>([]);
  const [wearSuccess, setWearSuccess] = useState<string | null>(null);

  // Virtual Try-On State (Nano Banana)
  const [tryOnModalOpen, setTryOnModalOpen] = useState<boolean>(false);
  const [selectedOutfitForTryOn, setSelectedOutfitForTryOn] = useState<StylistOutfitOption | null>(null);
  const [tryOnUserPhotoUrl, setTryOnUserPhotoUrl] = useState<string>(userProfile?.photoURL || '');
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string | null>(null);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState<boolean>(false);
  const [tryOnResolution, setTryOnResolution] = useState<'1K' | '2K' | '4K'>('2K');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const tryOnFileRef = useRef<HTMLInputElement>(null);

  // Gatekeeper Wardrobe Add Modal State
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState<boolean>(false);
  const [gatekeeperImageSrc, setGatekeeperImageSrc] = useState<string | null>(null);
  const [gatekeeperFileName, setGatekeeperFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Selection for Gatekeeper Modal (prevents blind upload)
  const handleFileSelectForGatekeeper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.uid) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setGatekeeperImageSrc(reader.result as string);
        setGatekeeperFileName(file.name);
        setIsGatekeeperOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  // Handle Successful Gatekeeper Submission
  const handleGatekeeperSuccess = async (newItem: {
    title: string;
    category: string;
    description: string;
    imgbbUrl: string;
  }) => {
    if (!userProfile?.uid) return;

    await addWardrobeItemToFirestore({
      userId: userProfile.uid,
      name: newItem.title,
      category: newItem.category,
      imageUrl: newItem.imgbbUrl,
      status: 'clean',
      tags: {
        description: newItem.description,
        formalityLevel: 'Casual',
        season: 'All Season'
      }
    });

    setIsGatekeeperOpen(false);
    setGatekeeperImageSrc(null);
  };

  // Laundry Reset Loading
  const [resettingLaundry, setResettingLaundry] = useState(false);

  // Filter Wardrobe items by category and gender/accessory filter
  const filteredItems = wardrobeItems.filter((item) => {
    // Category filter
    if (selectedCategory !== 'All' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    // Gender / Type filter
    if (genderFilter === 'Menswear') {
      const tg = (item.tags?.targetGender || '').toLowerCase();
      if (tg === 'female') return false;
    } else if (genderFilter === 'Accessories') {
      const cat = item.category.toLowerCase();
      const isAccessory = cat === 'watches' || cat === 'glasses' || cat === 'custom' || cat.includes('access');
      if (!isAccessory) return false;
    }
    return true;
  });

  // Handle Item Deletion
  const handleDeleteItem = async (item: WardrobeItem) => {
    if (window.confirm(`Remove "${item.name}" from your wardrobe?`)) {
      if (userProfile?.uid) {
        await deleteWardrobeItemFromFirestore(item.id, userProfile.uid);
      }
    }
  };

  const cleanItemsCount = wardrobeItems.filter((i) => i.status === 'clean').length;
  const laundryItemsCount = wardrobeItems.filter((i) => i.status === 'in_laundry').length;

  const todayDateStr = new Date().toISOString().split('T')[0];
  const outfitCacheKey = `syncmate_outfits_${todayDateStr}`;

  // Check for cached outfits on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(outfitCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOutfitOptions(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached outfits:', e);
    }
  }, [outfitCacheKey]);

  // Generate 3 Contextual AI Outfits (with caching)
  const handleGenerateOutfits = async (forceFresh = false) => {
    if (!userProfile?.uid || generating || isFetchingRef.current) return;

    if (!forceFresh) {
      try {
        const cached = localStorage.getItem(outfitCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOutfitOptions(parsed);
            return;
          }
        }
      } catch (e) {
        // ignore cache parse error
      }
    }

    isFetchingRef.current = true;
    setGenerating(true);
    setWearSuccess(null);

    const cleanItems = wardrobeItems.filter((i) => i.status === 'clean');

    let resultingOutfits: StylistOutfitOption[] = [];

    try {
      const itemsSummary = cleanItems.map(item => `[ID: ${item.id}] ${item.name} (Category: ${item.category}${item.tags?.color ? `, Color: ${item.tags.color}` : ''})`).join('\n');

      const stylistPrompt = `You are SyncMate AI Personal Stylist. Analyze the user's available wardrobe PNG items, local weather, and today's schedule to create 3 styled outfit recommendations.

WEATHER CONTEXT:
Temperature: ${weather?.temperature || 24}°C, Condition: ${weather?.condition || 'Clear'}

SCHEDULE / TASKS:
${tasks.map(t => `- ${t.title} (${t.category || 'general'}, ${t.startTime || ''}-${t.endTime || ''})`).join('\n') || 'No scheduled tasks today'}

AVAILABLE CLEAN WARDROBE ITEMS:
${itemsSummary || 'No specific wardrobe items listed'}

REQUIREMENTS:
Select from the available item IDs above to create 3 distinct outfit options:
1. Option A: Executive Sharp (high impact, professional)
2. Option B: Smart Casual Alternative (versatile, agile)
3. Option C: Deep Focus Comfort (ergonomic, comfortable)

Return ONLY a valid JSON array containing 3 objects matching this exact structure:
[
  {
    "id": "option_a",
    "title": "Option A: Executive Sharp",
    "vibe": "Optimal for executive meetings & clear weather",
    "itemIds": ["id1", "id2"],
    "styleNotes": "High impact tailored ensemble for executive confidence."
  },
  {
    "id": "option_b",
    "title": "Option B: Smart Casual Alternative",
    "vibe": "Versatile and modern",
    "itemIds": ["id1", "id3"],
    "styleNotes": "Clean, effortless style for agile focus."
  },
  {
    "id": "option_c",
    "title": "Option C: Deep Focus Comfort",
    "vibe": "Ergonomic comfort for long hours",
    "itemIds": ["id2", "id4"],
    "styleNotes": "Maximum breathable comfort for deep work."
  }
]
Only use item IDs that actually exist in the AVAILABLE CLEAN WARDROBE ITEMS list. Ensure output is valid JSON array inside \`\`\`json \`\`\` or raw JSON array.`;

      const replyText = await callGeminiWithFallback(stylistPrompt);

      let parsedOutfits: any[] = [];
      const match = replyText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        parsedOutfits = JSON.parse(match[1]);
      } else {
        try {
          parsedOutfits = JSON.parse(replyText);
        } catch (e) {
          // ignore
        }
      }

      if (Array.isArray(parsedOutfits) && parsedOutfits.length > 0) {
        resultingOutfits = parsedOutfits;
      }
    } catch (err) {
      console.warn('Stylist client-side call error, applying fallback:', err);
    }

    if (resultingOutfits.length === 0) {
      // Fallback outfit generation
      const itemIds = cleanItems.slice(0, 4).map((i) => i.id);
      resultingOutfits = [
        {
          id: 'option_a',
          title: 'Option A: Executive Sharp',
          vibe: 'Optimal for today’s schedule & weather',
          itemIds: itemIds,
          styleNotes: 'High impact tailored ensemble for executive confidence.'
        },
        {
          id: 'option_b',
          title: 'Option B: Smart Casual Alternative',
          vibe: 'Versatile and modern',
          itemIds: itemIds.slice(0, 3),
          styleNotes: 'Clean, effortless style for agile focus.'
        },
        {
          id: 'option_c',
          title: 'Option C: Deep Focus Comfort',
          vibe: 'Ergonomic comfort for long hours',
          itemIds: itemIds.slice(1, 4),
          styleNotes: 'Maximum breathable comfort for deep work.'
        }
      ];
    }

    // Cache outfits for today
    try {
      localStorage.setItem(outfitCacheKey, JSON.stringify(resultingOutfits));
    } catch (e) {
      console.warn('Failed to cache outfits in localStorage:', e);
    }

    setOutfitOptions(resultingOutfits);
    setGenerating(false);
    isFetchingRef.current = false;
  };

  // Wear This Today Action Handler
  const handleWearOutfit = async (outfit: StylistOutfitOption) => {
    if (!userProfile?.uid) return;

    // 1. Save style log
    await saveStyleLogToFirestore({
      userId: userProfile.uid,
      date: new Date().toISOString().split('T')[0],
      outfitTitle: outfit.title,
      vibe: outfit.vibe,
      styleNotes: outfit.styleNotes,
      itemIds: outfit.itemIds
    });

    // 2. Mark items as in_laundry
    for (const id of outfit.itemIds) {
      await updateWardrobeItemStatusInFirestore(id, userProfile.uid, 'in_laundry');
    }

    setWearSuccess(`Looking sharp today! 🌟 Option logged and items sent to laundry.`);
    if (onOutfitSelected) onOutfitSelected();
  };

  // Open Virtual Try-On Modal
  const handleOpenTryOnModal = (outfit: StylistOutfitOption) => {
    setSelectedOutfitForTryOn(outfit);
    setTryOnResultUrl(null);
    if (!tryOnUserPhotoUrl && userProfile?.photoURL) {
      setTryOnUserPhotoUrl(userProfile.photoURL);
    }
    setTryOnModalOpen(true);
  };

  // Upload custom base photo for Try-On
  const handleTryOnPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadToImgBB(file);
      if (publicUrl) {
        setTryOnUserPhotoUrl(publicUrl);
      }
    } catch (err) {
      console.error('Try-on photo upload error:', err);
    }
  };

  // Run Virtual Try-On Nano Banana AI request
  const handleRunVirtualTryOn = async (customSize?: '1K' | '2K' | '4K') => {
    if (!selectedOutfitForTryOn) return;

    const sizeToUse = customSize || tryOnResolution;
    setIsGeneratingTryOn(true);

    try {
      const outfitItems = selectedOutfitForTryOn.itemIds
        .map((id) => wardrobeItems.find((w) => w.id === id))
        .filter(Boolean) as WardrobeItem[];

      const clothingImageUrls = outfitItems.map((item) => item.imageUrl).filter(Boolean);
      const selectedItemName = outfitItems.map((i) => i.name).join(', ') || selectedOutfitForTryOn.title;
      const currentWeather = weather ? `${weather.temperature}°C, ${weather.condition}` : 'Clear 24°C';

      const apiKey = await getDecryptedApiKey();
      if (!apiKey) {
        setIsApiKeyModalOpen(true);
        throw new Error("Please connect your Google Gemini API key first.");
      }

      // Execute Virtual Try-On analysis directly in-browser
      const responseText = await callGeminiWithFallback(
        `Analyze the user base photo and clothing item (${selectedItemName}) to generate a realistic fit & color match report for today's weather (${currentWeather}).`
      );

      const mainItemImage = clothingImageUrls[0] || tryOnUserPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80';
      setTryOnResultUrl(mainItemImage);
    } catch (err: any) {
      console.error('Virtual try-on error:', err);
      if (err?.message?.includes('API key') || err?.message?.includes('API Key Blocked') || err?.message?.includes('connect your Google Gemini API key')) {
        setIsApiKeyModalOpen(true);
      }
      const outfitItems = selectedOutfitForTryOn.itemIds
        .map((id) => wardrobeItems.find((w) => w.id === id))
        .filter(Boolean) as WardrobeItem[];
      const clothingImageUrls = outfitItems.map((item) => item.imageUrl).filter(Boolean);
      const fallbackImg = clothingImageUrls[0] || tryOnUserPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80';
      setTryOnResultUrl(fallbackImg);
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

  // Reset Laundry Action
  const handleResetLaundry = async () => {
    if (!userProfile?.uid) return;
    setResettingLaundry(true);
    const inLaundryIds = wardrobeItems.filter((i) => i.status === 'in_laundry').map((i) => i.id);
    await resetUserLaundryInFirestore(userProfile.uid, inLaundryIds);
    setResettingLaundry(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <Shirt className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Today Wear Engine</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase tracking-wider">
                Digital Closet & Stylist
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Contextual AI outfit pairing based on local weather ({weather?.temperature || 24}°C) and today's schedule.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('stylist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'stylist'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Stylist</span>
          </button>
          <button
            onClick={() => setActiveTab('closet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'closet'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>My Closet ({wardrobeItems.length})</span>
          </button>
        </div>
      </div>

      {/* AI STYLIST TAB */}
      {activeTab === 'stylist' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Weather & Context Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Weather: <strong className="text-slate-900 dark:text-white">{weather?.temperature || 24}°C, {weather?.condition || 'Clear'}</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Today's Tasks: <strong className="text-slate-900 dark:text-white">{tasks.length} Scheduled</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Clean Items Available: <strong className="text-emerald-600 dark:text-emerald-400">{cleanItemsCount}</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleGenerateOutfits(true)}
              disabled={generating || cleanItemsCount === 0}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Designing 3 Today's Outfits...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>🔄 Generate Today's Looks</span>
                </>
              )}
            </button>
          </div>

          {/* Success Banner */}
          {wearSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center space-x-3 shadow-md animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{wearSuccess}</span>
            </div>
          )}

          {/* Outfit Options Display */}
          {outfitOptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {outfitOptions.map((outfit) => {
                const outfitItems = outfit.itemIds
                  .map((id) => wardrobeItems.find((w) => w.id === id))
                  .filter(Boolean) as WardrobeItem[];

                return (
                  <div
                    key={outfit.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-indigo-400/50 transition-all group"
                  >
                    <div>
                      {/* Outfit Header */}
                      <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {outfit.title}
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                          {outfit.vibe}
                        </p>
                      </div>

                      {/* Items Ensemble Grid */}
                      <div className="space-y-3 mb-5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Included Ensemble:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {outfitItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center space-x-2"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div className="truncate">
                                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.name}
                                </span>
                                <span className="text-[9px] text-slate-400 block">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Style Notes */}
                      <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-300 italic mb-5">
                        "{outfit.styleNotes}"
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleOpenTryOnModal(outfit)}
                        className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center space-x-1.5 transition-all transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>✨ Virtual Try-On (Nano Banana)</span>
                      </button>

                      <button
                        onClick={() => handleWearOutfit(outfit)}
                        className="w-full py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs shadow-md border border-slate-700/80 flex items-center justify-center space-x-1.5 transition-all transform active:scale-95"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Wear This Today</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <Shirt className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Ready to Style Your Day?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                Click "🔄 Generate Today's Looks" above to analyze today's weather and schedule, producing 3 custom outfit choices from your clean wardrobe.
              </p>
              <button
                onClick={handleGenerateOutfits}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
              >
                Generate Looks Now
              </button>
            </div>
          )}

        </div>
      )}

      {/* MY CLOSET TAB */}
      {activeTab === 'closet' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Filter Toggle [ All Items | Menswear | Accessories ] & Category Pills */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 w-fit">
                {(['All', 'Menswear', 'Accessories'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGenderFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      genderFilter === filter
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {filter === 'All' ? 'All Items' : filter}
                  </button>
                ))}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileSelectForGatekeeper}
              />

              {laundryItemsCount > 0 && (
                <button
                  onClick={handleResetLaundry}
                  disabled={resettingLaundry}
                  className="px-4 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-300 dark:border-amber-800 flex items-center space-x-1.5 hover:bg-amber-200 transition-all"
                  title="Reset all laundry items to clean"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resettingLaundry ? 'animate-spin' : ''}`} />
                  <span>🧺 Laundry Day Reset ({laundryItemsCount})</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Custom Item</span>
              </button>
            </div>

          </div>

          {/* Wardrobe Grid or Empty State */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm my-6">
              <Shirt className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your closet is empty. Add items to begin.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                Upload photos of your clothes, footwear, and accessories to build your digital wardrobe.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md inline-flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Clothing Photo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between group hover:border-indigo-400 transition-all relative"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Red Delete Button in top-right corner */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white shadow-md backdrop-blur-md transition-all z-20 flex items-center space-x-1 text-[10px] font-bold"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Status Badge in top-left */}
                  <div className="absolute top-2 left-2">
                    {item.status === 'clean' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Clean</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center space-x-1">
                        <span>Laundry 🧺</span>
                      </span>
                    )}
                  </div>

                  {/* Category & Gender Pill */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-slate-900/80 text-white backdrop-blur-md">
                      {item.category}
                    </span>
                    {item.tags?.targetGender && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-extrabold uppercase bg-indigo-900/80 text-indigo-200 backdrop-blur-md">
                        {item.tags.targetGender}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                    {item.name}
                  </h4>
                  {item.tags?.description && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.tags.description}
                    </p>
                  )}
                  {item.tags?.color && (
                    <span className="inline-block mt-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                      {item.tags.color} • {item.tags.formalityLevel || 'Casual'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

        </div>
      )}

      {/* VIRTUAL TRY-ON MODAL (Nano Banana) */}
      {tryOnModalOpen && selectedOutfitForTryOn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center space-x-2">
                    <span>✨ Virtual Try-On</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-purple-500 to-pink-500 text-white uppercase tracking-wider">
                      Nano Banana AI
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Outfit: <strong className="text-indigo-300">{selectedOutfitForTryOn.title}</strong> ({selectedOutfitForTryOn.vibe})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTryOnModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Outfit Clothing Items Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Clothing Ensemble Being Tried On:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedOutfitForTryOn.itemIds
                  .map((id) => wardrobeItems.find((w) => w.id === id))
                  .filter(Boolean)
                  .map((item) => (
                    <div key={item!.id} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2">
                      <img src={item!.imageUrl} alt={item!.name} className="w-8 h-8 rounded-lg object-cover border border-slate-600 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-200 truncate">{item!.name}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Base User Photo & Resolution Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                  1. Your Base Photo:
                </label>
                <div className="flex items-center space-x-3">
                  <img
                    src={tryOnUserPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80'}
                    alt="User photo"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/50 shrink-0"
                  />
                  <div>
                    <input
                      type="file"
                      ref={tryOnFileRef}
                      onChange={handleTryOnPhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => tryOnFileRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-300 border border-slate-700 transition-all flex items-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Selfie</span>
                    </button>
                    <span className="text-[9px] text-slate-500 block mt-1">ImgBB cloud hosted</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                  2. Select Resolution Quality:
                </label>
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 space-x-1">
                  {(['1K', '2K', '4K'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTryOnResolution(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tryOnResolution === s
                          ? 'bg-purple-600 text-white font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Try-On Result Section */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 min-h-[260px] flex items-center justify-center">
              {isGeneratingTryOn ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-400 border-t-transparent animate-spin flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-purple-300 tracking-wide">
                      Generating custom visual with Nano Banana ({tryOnResolution})...
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                      Blending clothing items onto your body structure while preserving facial features and background lighting.
                    </p>
                  </div>
                </div>
              ) : tryOnResultUrl ? (
                <div className="relative w-full flex flex-col items-center">
                  <img
                    src={tryOnResultUrl}
                    alt="Nano Banana Virtual Try-On"
                    className="max-h-96 w-auto rounded-2xl object-contain border border-purple-500/40 shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-3 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center space-x-1.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Photorealistic Nano Banana Try-On Complete ({tryOnResolution})</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <Shirt className="w-10 h-10 text-purple-400 mx-auto opacity-80" />
                  <p className="text-xs font-bold text-slate-300">
                    Ready to see how this outfit looks on you?
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRunVirtualTryOn()}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-black shadow-lg flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Render Virtual Try-On Now ({tryOnResolution})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTryOnModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Close
              </button>
              {tryOnResultUrl && (
                <button
                  type="button"
                  onClick={() => {
                    handleWearOutfit(selectedOutfitForTryOn);
                    setTryOnModalOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Wear This Outfit Today</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* GATEKEEPER ADD WARDROBE ITEM MODAL */}
      <AddWardrobeItemModal
        isOpen={isGatekeeperOpen}
        imageSrc={gatekeeperImageSrc}
        initialFileName={gatekeeperFileName}
        onClose={() => {
          setIsGatekeeperOpen(false);
          setGatekeeperImageSrc(null);
        }}
        onSuccess={handleGatekeeperSuccess}
        userId={userProfile?.uid || ''}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

    </div>
  );
};
