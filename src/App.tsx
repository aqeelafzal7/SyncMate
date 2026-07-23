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
  addProjectToFirestore
} from './lib/firebase';
import { UserProfile, ThemeMode, Task, Project, PrayerTimings, WeatherData } from './types';
import { getUserCurrentCoordinates, fetchPrayerTimings, fetchWeatherData } from './lib/contextService';

import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingChat } from './components/OnboardingChat';
import { Timeline } from './components/Timeline';
import { FloatingAssistant } from './components/FloatingAssistant';
import { TaskModal } from './components/TaskModal';
import { ProjectsView } from './components/ProjectsView';
import { ActiveTimerModal } from './components/ActiveTimerModal';

import { Calendar, Target, Bot, Sparkles, Loader2, Timer } from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme Mode
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('syncmate_theme') as ThemeMode) || 'dark';
  });

  // App View Mode
  const [activeTab, setActiveTab] = useState<'timeline' | 'projects'>('timeline');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Firestore Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Context Engine State
  const [prayerTimings, setPrayerTimings] = useState<PrayerTimings | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultSlot, setTaskModalDefaultSlot] = useState<string | undefined>(undefined);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [completedTaskTitle, setCompletedTaskTitle] = useState<string | undefined>(undefined);

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
          setUserProfile(profile);
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await saveUserProfile(newProf);
          setUserProfile(newProf);
          setShowOnboarding(true);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Tasks & Projects
  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsubTasks = subscribeUserTasks(userProfile.uid, (data) => setTasks(data));
    const unsubProjects = subscribeUserProjects(userProfile.uid, (data) => setProjects(data));

    return () => {
      unsubTasks();
      unsubProjects();
    };
  }, [userProfile?.uid]);

  // Load Location & Context Engine Data (Prayer Timings + Weather)
  useEffect(() => {
    async function loadContext() {
      let coords = userProfile?.location;
      if (!coords) {
        coords = await getUserCurrentCoordinates();
        if (userProfile) {
          const updatedProf = { ...userProfile, location: coords };
          setUserProfile(updatedProf);
          await saveUserProfile(updatedProf);
        }
      }

      if (coords) {
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

  // Handlers
  const handleGuestLogin = async () => {
    setAuthLoading(true);
    const guestUid = `guest_${Date.now()}`;
    const guestProf: UserProfile = {
      uid: guestUid,
      email: 'guest@syncmate.ai',
      name: 'Guest User',
      occupation: 'Student / Professional',
      goals: 'Master daily productivity and focus',
      religion: 'Muslim', // Demo with Muslim 5 prayer anchors
      location: {
        latitude: 21.4225,
        longitude: 39.8262,
        city: 'Mecca Coordinates',
        updatedAt: new Date().toISOString()
      },
      onboarded: false, // Show onboarding chat first!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveUserProfile(guestProf);
    setUserProfile(guestProf);
    setShowOnboarding(true);
    setAuthLoading(false);
  };

  const handleCompleteOnboarding = async (finalProfile: UserProfile) => {
    await saveUserProfile(finalProfile);
    setUserProfile(finalProfile);
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    } finally {
      setUserProfile(null);
      setFirebaseUser(null);
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

    // Task Completion Trigger: Open Micro-Habit Injector & Active Timer Modal
    if (newStatus === 'completed') {
      setCompletedTaskTitle(task.title);
      setIsTimerModalOpen(true);
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

  // Main Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-20">
      
      {/* Top Navigation */}
      <Navbar
        userProfile={userProfile}
        theme={theme}
        onThemeChange={setTheme}
        weather={weather}
        locationName={userProfile?.location?.city}
        onSignOut={handleSignOut}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
        isAssistantOpen={isAssistantOpen}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Dynamic Daily Timeline</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Long-Term Projects</span>
            </button>
          </div>

          <button
            onClick={() => {
              setCompletedTaskTitle(undefined);
              setIsTimerModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all"
          >
            <Timer className="w-4 h-4" />
            <span>Micro-Habit & Rest Timer</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' && userProfile && (
          <Timeline
            userProfile={userProfile}
            tasks={tasks}
            prayerTimings={prayerTimings}
            weather={weather}
            onAddTaskClick={(slot) => {
              setTaskModalDefaultSlot(slot);
              setIsTaskModalOpen(true);
            }}
            onToggleTaskStatus={handleToggleTaskStatus}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'projects' && userProfile && (
          <ProjectsView
            projects={projects}
            onAddProject={handleAddProject}
            userId={userProfile.uid}
          />
        )}

      </main>

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
          onTaskCreated={handleSaveTask}
          onTasksRolledOver={handleTasksRolledOver}
        />
      )}

      {/* Active Micro-Habit & Rest Timer Modal */}
      <ActiveTimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        taskTitle={completedTaskTitle}
        initialMinutes={5}
      />

    </div>
  );
}
