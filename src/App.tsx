import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  auth, 
  getUserProfile, 
  saveUserProfile, 
  subscribeUserTasks, 
  addTaskToFirestore, 
  updateTaskInFirestore, 
  deleteTaskFromFirestore,
  subscribeUserProjects,
  addProjectToFirestore,
  updateProjectInFirestore,
  deleteProjectFromFirestore,
  subscribeUserWardrobe,
  subscribeStyleLogs,
  subscribeMyLookReports
} from './lib/firebase';
import { UserProfile, UserLocation, ThemeMode, Task, Project, PrayerTimings, WeatherData, ActiveTab, WardrobeItem, StyleLog, MyLookReport } from './types';
import { getUserCurrentCoordinates, fetchPrayerTimings, fetchWeatherData } from './lib/contextService';
import { updateUserLocationInFirestore } from './lib/locationService';
import { storageManager } from './lib/storageManager';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingChat } from './components/OnboardingChat';
import { Timeline } from './components/Timeline';
import { DailyStrategyView } from './components/DailyStrategyView';
import { TodayWearView } from './components/TodayWearView';
import { MyLookView } from './components/MyLookView';
import { HabitsView } from './components/HabitsView';
import { SettingsView } from './components/SettingsView';
import { BuySubscriptionView } from './components/BuySubscriptionView';
import { AdminSubscriptionQueue } from './components/AdminSubscriptionQueue';
import { AdminLayout } from './components/AdminLayout';
import { FloatingAssistant } from './components/FloatingAssistant';
import { TaskModal } from './components/TaskModal';
import { ProjectsView } from './components/ProjectsView';
import { CitySearchModal } from './components/CitySearchModal';
import { DobCollectionModal } from './components/DobCollectionModal';
import { BirthdayBalloonsOverlay } from './components/BirthdayBalloonsOverlay';
import { checkIsBirthday } from './lib/birthdayUtils';
import { processUserSubscriptionLifecycle } from './lib/subscriptionService';

import { Calendar, Target, Bot, Sparkles, Loader2, Timer, MapPin, Sun } from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme Mode
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('syncmate_theme') as ThemeMode) || 'dark';
  });

  // App View & Sidebar State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isCitySearchOpen, setIsCitySearchOpen] = useState(false);

  // Firestore Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [styleLogs, setStyleLogs] = useState<StyleLog[]>([]);
  const [myLookReports, setMyLookReports] = useState<MyLookReport[]>([]);

  // Context Engine State
  const [prayerTimings, setPrayerTimings] = useState<PrayerTimings | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Global Toast Notification State (e.g. for GPS permission alerts)
  const [globalToast, setGlobalToast] = useState<{ message: string; type: 'warning' | 'info' | 'success' } | null>(null);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ message: string; type: 'warning' | 'info' | 'success' }>;
      if (customEv.detail && customEv.detail.message) {
        setGlobalToast(customEv.detail);
        setTimeout(() => {
          setGlobalToast(null);
        }, 7000);
      }
    };
    window.addEventListener('syncmate_toast', handleToastEvent);
    return () => window.removeEventListener('syncmate_toast', handleToastEvent);
  }, []);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultSlot, setTaskModalDefaultSlot] = useState<string | undefined>(undefined);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  const hideBottomNav = isMobileSidebarOpen || isAssistantOpen || isCitySearchOpen || isTaskModalOpen || isTimelineModalOpen || showOnboarding;


  // Theme Sync Effect
  useEffect(() => {
    localStorage.setItem('syncmate_theme', theme);

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          const activeMood = profile.activeMood || 'neutral';
          let profProcessed = processUserSubscriptionLifecycle({ ...profile, activeMood });
          if (profProcessed.updatedAt !== profile.updatedAt) {
            saveUserProfile(profProcessed).catch(console.warn);
          }
          setUserProfile(profProcessed);
          localStorage.setItem('syncmate_current_mood', activeMood);
          setShowOnboarding(!profile.onboarded);
        } else {
          // New account, create initial profile draft
          const newProf: UserProfile = {
            uid: user.uid,
            email: user.email || 'user@syncmate.ai',
            name: user.displayName || user.email?.split('@')[0] || 'New User',
            occupation: '',
            goals: '',
            religion: 'None',
            onboarded: false,
            activeMood: 'neutral',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await saveUserProfile(newProf);
          setUserProfile(newProf);
          localStorage.setItem('syncmate_current_mood', 'neutral');
          setShowOnboarding(true);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Tasks, Projects, Wardrobe & Style Logs
  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsubTasks = subscribeUserTasks(userProfile.uid, (data) => setTasks(data));
    const unsubProjects = subscribeUserProjects(userProfile.uid, (data) => setProjects(data));
    const unsubWardrobe = subscribeUserWardrobe(userProfile.uid, (data) => setWardrobeItems(data));
    const unsubStyleLogs = subscribeStyleLogs(userProfile.uid, (data) => setStyleLogs(data));
    const unsubMyLook = subscribeMyLookReports(userProfile.uid, (data) => setMyLookReports(data));

    return () => {
      unsubTasks();
      unsubProjects();
      unsubWardrobe();
      unsubStyleLogs();
      unsubMyLook();
    };
  }, [userProfile?.uid]);


  // Load Location & Context Engine Data (Prayer Timings + Weather)
  useEffect(() => {
    async function loadContext() {
      const coords = await getUserCurrentCoordinates();
      if (coords && userProfile) {
        const updatedProf = { ...userProfile, location: coords };
        setUserProfile(updatedProf);
        saveUserProfile(updatedProf).catch(console.warn);
        if (userProfile.uid) {
          updateUserLocationInFirestore(userProfile.uid, coords).catch(console.warn);
        }
        const pTimings = await fetchPrayerTimings(coords.latitude, coords.longitude);
        setPrayerTimings(pTimings);

        const wData = await fetchWeatherData(coords.latitude, coords.longitude);
        setWeather(wData);
      }
    }

    if (userProfile) {
      loadContext();
    }
  }, [userProfile?.uid, userProfile?.religion]);

  // Security Guard for Admin Routes
  const isAdminMode = activeTab.startsWith('admin');
  const isAdmin = userProfile?.email === 'chaqeelpak@gmail.com';

  useEffect(() => {
    if (isAdminMode && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [isAdminMode, isAdmin]);

  const handleUpdateLocation = async (newLocation: UserLocation) => {
    if (!userProfile) return;
    const updatedProf = { ...userProfile, location: newLocation };
    setUserProfile(updatedProf);
    saveUserProfile(updatedProf).catch(console.warn);
    if (userProfile.uid) {
      updateUserLocationInFirestore(userProfile.uid, newLocation).catch(console.warn);
    }

    // Recalculate Prayer Timings & Weather immediately for the new city!
    const pTimings = await fetchPrayerTimings(newLocation.latitude, newLocation.longitude);
    setPrayerTimings(pTimings);

    const wData = await fetchWeatherData(newLocation.latitude, newLocation.longitude);
    setWeather(wData);
  };

  // Handlers
  const handleGuestLogin = async () => {
    setAuthLoading(true);
    const guestUid = `guest_${Date.now()}`;
    const initialLoc = await getUserCurrentCoordinates().catch(() => ({
      latitude: 31.5204,
      longitude: 74.3587,
      city: 'Detected City',
      updatedAt: new Date().toISOString()
    }));

    const guestProf: UserProfile = {
      uid: guestUid,
      email: 'guest@syncmate.ai',
      name: '',
      occupation: '',
      goals: '',
      religion: 'Muslim',
      location: initialLoc,
      onboarded: false, // Show onboarding chat first!
      activeMood: 'neutral',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveUserProfile(guestProf);
    setUserProfile(guestProf);
    localStorage.setItem('syncmate_current_mood', 'neutral');
    setShowOnboarding(true);
    setAuthLoading(false);
  };

  const handleUpdateActiveMood = async (newMood: string) => {
    if (!userProfile) return;
    const moodNormalized = newMood.toLowerCase().trim() || 'neutral';
    const updatedProf: UserProfile = { ...userProfile, activeMood: moodNormalized };
    setUserProfile(updatedProf);
    localStorage.setItem('syncmate_current_mood', moodNormalized);
    await saveUserProfile(updatedProf).catch(console.warn);
  };

  const handleResetActiveMood = async () => {
    await handleUpdateActiveMood('neutral');
  };

  const handleCompleteOnboarding = async (finalProfile: UserProfile) => {
    await saveUserProfile(finalProfile);
    setUserProfile(finalProfile);
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Remove all syncmate_ storage items using centralized storage manager
      storageManager.clearAllAppKeys();
      sessionStorage.clear();
      
      // Reset React state
      setUserProfile(null);
      setFirebaseUser(null);
      
      window.location.reload();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id'>) => {
    if (!userProfile) return;
    await addTaskToFirestore(taskData);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    if (!userProfile) return;
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await updateTaskInFirestore(task.id, userProfile.uid, { status: newStatus });

    // Task Completion Trigger: Cleanly route to dedicated Habits page for active rest
    if (newStatus === 'completed') {
      setActiveTab('habits');
    }
  };

  const handleTasksRolledOver = async (reorganizedTasks: any[]) => {
    if (!userProfile) return;
    for (const rt of reorganizedTasks) {
      if (rt.id) {
        await updateTaskInFirestore(rt.id, userProfile.uid, {
          startTime: rt.startTime,
          endTime: rt.endTime,
          aiTip: rt.aiTip || "Reorganized into today's optimal focus slot."
        });
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!userProfile) return;
    await deleteTaskFromFirestore(taskId, userProfile.uid);
  };

  const handleAddProject = async (projectData: Omit<Project, 'id'>) => {
    if (!userProfile) return;
    await addProjectToFirestore(projectData);
  };

  const handleUpdateProject = async (id: string, updatedData: Partial<Project>) => {
    if (!userProfile) return;
    await updateProjectInFirestore(id, userProfile.uid, updatedData);
  };

  const handleDeleteProject = async (id: string) => {
    if (!userProfile) return;
    await deleteProjectFromFirestore(id, userProfile.uid);
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-6 h-6 text-white animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold">SyncMate Autonomous Engine</h2>
          <p className="text-xs text-slate-400 mt-1">Initializing Firebase Auth & Context Services...</p>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!userProfile && !firebaseUser) {
    return <AuthScreen onGuestLogin={handleGuestLogin} />;
  }

  // Onboarding Chat Screen
  if (showOnboarding && userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <Navbar
          userProfile={userProfile}
          theme={theme}
          onThemeChange={setTheme}
          weather={weather}
          locationName={userProfile.location?.city}
          onSignOut={handleSignOut}
          onOpenOnboarding={() => setShowOnboarding(true)}
          onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
          isAssistantOpen={isAssistantOpen}
        />
        <main className="py-6">
          <OnboardingChat
            initialProfile={userProfile}
            onComplete={handleCompleteOnboarding}
          />
        </main>
      </div>
    );
  }

  // Dedicated Admin Workspace Layout
  if (isAdminMode && isAdmin) {
    return (
      <AdminLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userProfile={userProfile}
        onRefreshStats={async () => {
          if (userProfile?.uid) {
            const refreshed = await getUserProfile(userProfile.uid);
            if (refreshed) setUserProfile(refreshed);
          }
        }}
      />
    );
  }

  // Main Executive Lifestyle OS Layout
  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Floating Global Toast Banner */}
      {globalToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-fadeIn">
          <span className="shrink-0 text-base">⚠️</span>
          <span className="flex-1 leading-relaxed">{globalToast.message}</span>
          <button 
            onClick={() => setGlobalToast(null)}
            className="text-amber-400 hover:text-white p-1 font-black text-sm shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        hideBottomNav={hideBottomNav}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Content Area (Offset for Desktop Sidebar) */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        
        {/* Top Header Navbar */}
        <Navbar
          userProfile={userProfile}
          theme={theme}
          onThemeChange={setTheme}
          onSignOut={handleSignOut}
          onOpenOnboarding={() => setShowOnboarding(true)}
          onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
          isAssistantOpen={isAssistantOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dynamic View Router */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-8 space-y-6">
          
          {/* Dashboard View (Timeline) */}
          {activeTab === 'dashboard' && userProfile && (
            <Timeline
              userProfile={userProfile}
              tasks={tasks}
              prayerTimings={prayerTimings}
              weather={weather}
              locationName={userProfile?.location?.city}
              activeMood={userProfile.activeMood || 'neutral'}
              onResetMood={handleResetActiveMood}
              onAddTaskClick={(slot) => {
                setTaskModalDefaultSlot(slot);
                setIsTaskModalOpen(true);
              }}
              onToggleTaskStatus={handleToggleTaskStatus}
              onDeleteTask={handleDeleteTask}
              onOpenTimerModal={() => {
                setActiveTab('habits');
              }}
              onOpenCitySearch={() => setIsCitySearchOpen(true)}
              onOpenStrategy={() => setActiveTab('daily_strategy')}
              onIslamicModalChange={setIsTimelineModalOpen}
            />
          )}

          {/* Daily Executive Strategy View */}
          {activeTab === 'daily_strategy' && userProfile && (
            <DailyStrategyView
              userProfile={userProfile}
              weather={weather}
              tasks={tasks}
            />
          )}

          {/* Today Wear View (Wardrobe & AI Stylist Engine) */}
          {activeTab === 'today_wear' && (
            <TodayWearView
              wardrobeItems={wardrobeItems}
              userProfile={userProfile}
              weather={weather}
              tasks={tasks}
              onOutfitSelected={() => setActiveTab('my_look')}
            />
          )}

          {/* My Look View (Active Look, Biometrics & Style Logs) */}
          {activeTab === 'my_look' && (
            <MyLookView
              myLookReports={myLookReports}
              styleLogs={styleLogs}
              wardrobeItems={wardrobeItems}
              userProfile={userProfile}
              onGoToStylist={() => setActiveTab('today_wear')}
            />
          )}

          {/* Projects View */}
          {activeTab === 'projects' && userProfile && (
            <ProjectsView
              projects={projects}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onTaskCreated={handleSaveTask}
              userId={userProfile.uid}
              userProfile={userProfile}
              prayerTimings={prayerTimings}
              existingTasks={tasks}
            />
          )}

          {/* Habits View */}
          {activeTab === 'habits' && (
            <HabitsView userProfile={userProfile} />
          )}

          {/* Buy Subscription View */}
          {activeTab === 'buy_subscription' && (
            <BuySubscriptionView
              userProfile={userProfile}
              onGoToSettings={() => setActiveTab('settings')}
            />
          )}

          {/* Admin Queue View */}
          {activeTab === 'admin_queue' && (
            <AdminSubscriptionQueue
              onRefreshStats={async () => {
                if (userProfile?.uid) {
                  const refreshed = await getUserProfile(userProfile.uid);
                  if (refreshed) setUserProfile(refreshed);
                }
              }}
            />
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <SettingsView
              userProfile={userProfile}
              theme={theme}
              onThemeChange={setTheme}
              onOpenCitySearch={() => setIsCitySearchOpen(true)}
              onUpdateProfile={(updated) => setUserProfile(updated)}
            />
          )}

        </main>

      </div>

      {/* Task Creation Modal */}
      {userProfile && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          defaultStartTime={taskModalDefaultSlot}
          onSaveTask={handleSaveTask}
          userId={userProfile.uid}
        />
      )}

      {/* Floating AI Assistant Drawer */}
      {userProfile && (
        <FloatingAssistant
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          userProfile={userProfile}
          tasks={tasks}
          prayerTimings={prayerTimings}
          weather={weather}
          onTaskCreated={handleSaveTask}
          onTasksRolledOver={handleTasksRolledOver}
          onUpdateActiveMood={handleUpdateActiveMood}
        />
      )}

      {/* Manual City Search & High-Accuracy GPS Override Modal */}
      <CitySearchModal
        isOpen={isCitySearchOpen}
        onClose={() => setIsCitySearchOpen(false)}
        currentCity={userProfile?.location?.city}
        onSelectLocation={handleUpdateLocation}
      />

      {/* Retroactive DOB Collection Modal */}
      {userProfile && !userProfile.dob && !showOnboarding && (
        <DobCollectionModal
          userProfile={userProfile}
          onSaveProfile={(updated) => setUserProfile(updated)}
        />
      )}

      {/* 24-Hour Birthday Mode Interactive Balloons & Confetti Overlay */}
      <BirthdayBalloonsOverlay
        isBirthdayMode={checkIsBirthday(userProfile?.dob)}
      />

    </div>
  );
}

