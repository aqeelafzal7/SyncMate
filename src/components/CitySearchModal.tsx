import React, { useState } from 'react';
import { Search, MapPin, Navigation, X, Check, Loader2, Compass } from 'lucide-react';
import { UserLocation } from '../types';
import { searchCityCoordinates, getUserCurrentCoordinates } from '../lib/contextService';

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  onSelectLocation: (location: UserLocation) => void;
}

const POPULAR_CITIES = [
  'Faisalabad, Pakistan',
  'Lahore, Pakistan',
  'Islamabad, Pakistan',
  'Karachi, Pakistan',
  'Rawalpindi, Pakistan',
  'Multan, Pakistan',
  'Peshawar, Pakistan',
  'London, UK',
  'Dubai, UAE',
  'New York, USA'
];

export const CitySearchModal: React.FC<CitySearchModalProps> = ({
  isOpen,
  onClose,
  currentCity,
  onSelectLocation,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await searchCityCoordinates(searchQuery);
      if (result) {
        setSearchResults([result]);
      } else {
        setErrorMsg(`No coordinates found for "${searchQuery}". Please try another city name.`);
        setSearchResults([]);
      }
    } catch {
      setErrorMsg('Failed to search location. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location: UserLocation) => {
    onSelectLocation(location);
    onClose();
  };

  const handleUseGPS = async () => {
    setGpsLoading(true);
    setErrorMsg(null);
    try {
      const coords = await getUserCurrentCoordinates();
      onSelectLocation(coords);
      onClose();
    } catch {
      setErrorMsg('Could not detect GPS location. Please type your city manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Your City Location
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentCity || 'Detected Location'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS High Accuracy Button */}
        <div className="mb-5">
          <button
            onClick={handleUseGPS}
            disabled={gpsLoading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Detecting High-Accuracy GPS...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Use My High-Accuracy GPS Location</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
          <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Or Search Manually
          </span>
        </div>

        {/* Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex items-center space-x-2 mb-4"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city (e.g., Faisalabad, Lahore, Islamabad)..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-md shrink-0 flex items-center space-x-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Result:</span>
            {searchResults.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(loc)}
                className="w-full p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {loc.city}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Coordinates: {loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}°
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
                  Select
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Popular City Shortcuts */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Popular Cities:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {POPULAR_CITIES.map((cityName) => (
              <button
                key={cityName}
                onClick={() => {
                  setQuery(cityName);
                  handleSearch(cityName);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition-all"
              >
                {cityName}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
          Selecting a new city automatically updates your 5 daily Prayer Anchors and Local Weather in real time.
        </p>

      </div>
    </div>
  );
};
