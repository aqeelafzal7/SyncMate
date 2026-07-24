import React, { useState } from 'react';
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
  deleteWardrobeItemFromFirestore
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
  const [outfitOptions, setOutfitOptions] = useState<StylistOutfitOption[]>([]);
  const [wearSuccess, setWearSuccess] = useState<string | null>(null);

  // Add Custom Item State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [itemName, setItemName] = useState('');
  const [customCategory, setCustomCategory] = useState('Tops');
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzingVision, setAnalyzingVision] = useState(false);
  const [previewTags, setPreviewTags] = useState<any>(null);

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

  // Handle File Upload to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        setImageBase64(base64Str);
        setImageUrl(base64Str);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Gemini Vision Auto-Tagging
  const handleAnalyzeVision = async () => {
    if (!itemName && !imageBase64) return;
    setAnalyzingVision(true);
    try {
      const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
      const res = await fetch('/api/wardrobe/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          itemName,
          customCategory,
          customApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewTags(data.tags);
      }
    } catch (err) {
      console.warn('Vision analyze failed:', err);
    } finally {
      setAnalyzingVision(false);
    }
  };

  // Submit New Custom Wardrobe Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid || !itemName.trim()) return;

    const fallbackImg = imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80';

    const newItem = {
      userId: userProfile.uid,
      name: itemName.trim(),
      category: customCategory || 'Custom',
      imageUrl: fallbackImg,
      status: 'clean' as const,
      tags: previewTags || {
        color: 'Classic',
        formalityLevel: 'Smart Casual',
        season: 'All Season',
        description: `Custom ${customCategory} item`
      }
    };

    await addWardrobeItemToFirestore(newItem);

    // Reset Modal
    setItemName('');
    setCustomCategory('Tops');
    setImageUrl('');
    setImageBase64(null);
    setPreviewTags(null);
    setIsAddModalOpen(false);
  };

  // Generate 3 Contextual AI Outfits
  const handleGenerateOutfits = async () => {
    if (!userProfile?.uid) return;
    setGenerating(true);
    setWearSuccess(null);

    const cleanItems = wardrobeItems.filter((i) => i.status === 'clean');

    try {
      const customApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
      const res = await fetch('/api/wardrobe/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather,
          tasks,
          wardrobeItems: cleanItems,
          userProfile,
          customApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.outfits) {
          setOutfitOptions(data.outfits);
        }
      }
    } catch (err) {
      console.warn('Stylist endpoint error, applying client-side fallback:', err);
      // Fallback outfit generation
      const itemIds = cleanItems.slice(0, 4).map((i) => i.id);
      setOutfitOptions([
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
      ]);
    } finally {
      setGenerating(false);
    }
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
              onClick={handleGenerateOutfits}
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

                    {/* Action Button */}
                    <button
                      onClick={() => handleWearOutfit(outfit)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Wear This Today</span>
                    </button>
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
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Custom Item</span>
              </button>
            </div>

          </div>

          {/* Wardrobe Grid */}
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

        </div>
      )}

      {/* ADD CUSTOM WARDROBE ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-900 dark:text-white">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Shirt className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Add Custom Wardrobe Item
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Item Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Silver Ring, Navy Blazer, Leather Shoes..."
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Category (Standard or Custom)
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Tops, Bottoms, Rings, Earrings, Accessories..."
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Upload Photo or Paste Image URL
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Image & Vision Tagging Preview */}
              {(imageUrl || imageBase64) && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                  <img
                    src={imageUrl || imageBase64 || ''}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                  />
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={handleAnalyzeVision}
                      disabled={analyzingVision}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                    >
                      {analyzingVision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Auto-Tag with Gemini Vision</span>
                    </button>
                    {previewTags && (
                      <div className="mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold">
                        Tag: {previewTags.color} • {previewTags.formalityLevel} • {previewTags.season}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md"
                >
                  Save to Wardrobe
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
