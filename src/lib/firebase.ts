import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { UserProfile, Task, Project, WardrobeItem, StyleLog, MyLookReport } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyDSaP14gCiA6N9ZwTKYLchhh4Frwdr6mz0",
  authDomain: "syncmate-a.firebaseapp.com",
  projectId: "syncmate-a",
  storageBucket: "syncmate-a.firebasestorage.app",
  messagingSenderId: "194690855860",
  appId: "1:194690855860:web:e99874814ae4462f7eb8e1",
  measurementId: "G-SHH2SGHX13"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ImgBB Upload Utility
export const uploadToImgBB = async (file: File | Blob | string): Promise<string | null> => {
  const apiKey = 'ec3e917febb898867d674326f22118e5';
  const formData = new FormData();
  
  if (typeof file === 'string') {
    const cleanBase64 = file.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    formData.append('image', cleanBase64);
  } else {
    formData.append('image', file);
  }

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.success && data.data?.url) {
      return data.data.url;
    } else {
      throw new Error(data?.error?.message || "ImgBB upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

// User Profile Firestore Operations
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Firestore getUserProfile error, checking local fallback:', err);
    const local = localStorage.getItem(`syncmate_user_${uid}`);
    return local ? JSON.parse(local) : null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveUserProfile fallback to localStorage:', err);
  } finally {
    localStorage.getItem(`syncmate_user_${profile.uid}`);
    localStorage.setItem(`syncmate_user_${profile.uid}`, JSON.stringify(profile));
  }
}

// Tasks Firestore Operations
export function subscribeUserTasks(uid: string, callback: (tasks: Task[]) => void) {
  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      callback(tasks);
    }, (error) => {
      console.warn('Tasks subscription fallback to local cache:', error);
      const local = localStorage.getItem(`syncmate_tasks_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    console.warn('subscribeUserTasks catch fallback:', err);
    const local = localStorage.getItem(`syncmate_tasks_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function addTaskToFirestore(task: Omit<Task, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'tasks');
    const docRef = await addDoc(colRef, {
      ...task,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('addTaskToFirestore fallback to local cache:', err);
    const local = localStorage.getItem(`syncmate_tasks_${task.userId}`);
    const existing: Task[] = local ? JSON.parse(local) : [];
    const newId = `task_local_${Date.now()}`;
    const newTask: Task = { ...task, id: newId };
    existing.push(newTask);
    localStorage.setItem(`syncmate_tasks_${task.userId}`, JSON.stringify(existing));
    return newId;
  }
}

export async function updateTaskInFirestore(id: string, userId: string, updates: Partial<Task>): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('updateTaskInFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_tasks_${userId}`);
    let existing: Task[] = local ? JSON.parse(local) : [];
    existing = existing.map(t => t.id === id ? { ...t, ...updates } : t);
    localStorage.setItem(`syncmate_tasks_${userId}`, JSON.stringify(existing));
  }
}

export async function deleteTaskFromFirestore(id: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('deleteTaskFromFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_tasks_${userId}`);
    let existing: Task[] = local ? JSON.parse(local) : [];
    existing = existing.filter(t => t.id !== id);
    localStorage.setItem(`syncmate_tasks_${userId}`, JSON.stringify(existing));
  }
}

// Projects Firestore Operations
export function subscribeUserProjects(uid: string, callback: (projects: Project[]) => void) {
  try {
    const q = query(collection(db, 'projects'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() } as Project);
      });
      callback(projects);
    }, (err) => {
      console.warn('Projects snapshot error fallback:', err);
      const local = localStorage.getItem(`syncmate_projects_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    const local = localStorage.getItem(`syncmate_projects_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function addProjectToFirestore(project: Omit<Project, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'projects');
    const docRef = await addDoc(colRef, {
      ...project,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('addProjectToFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_projects_${project.userId}`);
    const existing: Project[] = local ? JSON.parse(local) : [];
    const newId = `project_local_${Date.now()}`;
    const newProj: Project = { ...project, id: newId };
    existing.push(newProj);
    localStorage.setItem(`syncmate_projects_${project.userId}`, JSON.stringify(existing));
    return newId;
  }
}

export async function updateProjectInFirestore(id: string, userId: string, updates: Partial<Project>): Promise<void> {
  try {
    const docRef = doc(db, 'projects', id);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('updateProjectInFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_projects_${userId}`);
    if (local) {
      let existing: Project[] = JSON.parse(local);
      existing = existing.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem(`syncmate_projects_${userId}`, JSON.stringify(existing));
    }
  }
}

export async function deleteProjectFromFirestore(id: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('deleteProjectFromFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_projects_${userId}`);
    if (local) {
      let existing: Project[] = JSON.parse(local);
      existing = existing.filter(p => p.id !== id);
      localStorage.setItem(`syncmate_projects_${userId}`, JSON.stringify(existing));
    }
  }
}

// Wardrobe Storage & Firestore Operations
export async function uploadWardrobePhoto(userId: string, file: File | Blob | string): Promise<string> {
  const url = await uploadToImgBB(file);
  if (url) return url;

  if (typeof file === 'string') return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file as Blob);
  });
}

export function subscribeUserWardrobe(uid: string, callback: (items: WardrobeItem[]) => void) {
  try {
    if (!auth.currentUser || uid.startsWith('guest')) {
      const local = localStorage.getItem(`syncmate_wardrobe_${uid}`);
      callback(local ? JSON.parse(local) : []);
      return () => {};
    }

    const q = query(collection(db, 'wardrobe'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const items: WardrobeItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as WardrobeItem);
      });
      callback(items);
    }, (err) => {
      console.warn('Wardrobe snapshot fallback to local:', err);
      const local = localStorage.getItem(`syncmate_wardrobe_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    const local = localStorage.getItem(`syncmate_wardrobe_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function addWardrobeItemToFirestore(item: Omit<WardrobeItem, 'id' | 'createdAt'>): Promise<string> {
  try {
    const colRef = collection(db, 'wardrobe');
    const docRef = await addDoc(colRef, {
      ...item,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('addWardrobeItemToFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_wardrobe_${item.userId}`);
    const existing: WardrobeItem[] = local ? JSON.parse(local) : [];
    const newId = `wardrobe_${Date.now()}`;
    const newItem: WardrobeItem = { ...item, id: newId, createdAt: new Date().toISOString() };
    existing.push(newItem);
    localStorage.setItem(`syncmate_wardrobe_${item.userId}`, JSON.stringify(existing));
    return newId;
  }
}

export async function updateWardrobeItemStatusInFirestore(id: string, userId: string, status: 'clean' | 'in_laundry'): Promise<void> {
  try {
    if (!id.startsWith('seed_')) {
      const docRef = doc(db, 'wardrobe', id);
      await updateDoc(docRef, { status });
    }
  } catch (err) {
    console.warn('updateWardrobeItemStatusInFirestore fallback:', err);
  } finally {
    const local = localStorage.getItem(`syncmate_wardrobe_${userId}`);
    if (local) {
      let existing: WardrobeItem[] = JSON.parse(local);
      existing = existing.map(i => i.id === id ? { ...i, status } : i);
      localStorage.setItem(`syncmate_wardrobe_${userId}`, JSON.stringify(existing));
    }
  }
}

export async function deleteWardrobeItemFromFirestore(id: string, userId: string): Promise<void> {
  try {
    if (!id.startsWith('seed_')) {
      const docRef = doc(db, 'wardrobe', id);
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn('deleteWardrobeItemFromFirestore fallback:', err);
  } finally {
    const local = localStorage.getItem(`syncmate_wardrobe_${userId}`);
    if (local) {
      let existing: WardrobeItem[] = JSON.parse(local);
      existing = existing.filter(i => i.id !== id);
      localStorage.setItem(`syncmate_wardrobe_${userId}`, JSON.stringify(existing));
    }
  }
}

export async function resetUserLaundryInFirestore(userId: string, itemIds: string[]): Promise<void> {
  try {
    for (const id of itemIds) {
      if (!id.startsWith('seed_')) {
        const docRef = doc(db, 'wardrobe', id);
        await updateDoc(docRef, { status: 'clean' });
      }
    }
  } catch (err) {
    console.warn('resetUserLaundryInFirestore fallback:', err);
  } finally {
    const local = localStorage.getItem(`syncmate_wardrobe_${userId}`);
    if (local) {
      let existing: WardrobeItem[] = JSON.parse(local);
      existing = existing.map(i => ({ ...i, status: 'clean' }));
      localStorage.setItem(`syncmate_wardrobe_${userId}`, JSON.stringify(existing));
    }
  }
}

// Style Logs Firestore Operations
export function subscribeStyleLogs(uid: string, callback: (logs: StyleLog[]) => void) {
  try {
    if (!auth.currentUser || uid.startsWith('guest')) {
      const local = localStorage.getItem(`syncmate_style_logs_${uid}`);
      callback(local ? JSON.parse(local) : []);
      return () => {};
    }

    const q = query(collection(db, 'style_logs'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const logs: StyleLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as StyleLog);
      });
      callback(logs);
    }, (err) => {
      console.warn('StyleLogs snapshot fallback:', err);
      const local = localStorage.getItem(`syncmate_style_logs_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    const local = localStorage.getItem(`syncmate_style_logs_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function saveStyleLogToFirestore(log: Omit<StyleLog, 'id' | 'createdAt'>): Promise<string> {
  try {
    const colRef = collection(db, 'style_logs');
    const docRef = await addDoc(colRef, {
      ...log,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('saveStyleLogToFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_style_logs_${log.userId}`);
    const existing: StyleLog[] = local ? JSON.parse(local) : [];
    const newId = `style_log_${Date.now()}`;
    const newLog: StyleLog = { ...log, id: newId, createdAt: new Date().toISOString() };
    existing.push(newLog);
    localStorage.setItem(`syncmate_style_logs_${log.userId}`, JSON.stringify(existing));
    return newId;
  }
}

// My Look Biometrics Firestore & Storage Operations
export async function uploadMyLookPhoto(userId: string, image: File | Blob | string): Promise<string> {
  const url = await uploadToImgBB(image);
  if (url) return url;
  if (typeof image === 'string') return image;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(image as Blob);
  });
}

export function subscribeMyLookReports(uid: string, callback: (reports: MyLookReport[]) => void) {
  try {
    if (!auth.currentUser || uid.startsWith('guest')) {
      const local = localStorage.getItem(`syncmate_my_look_reports_${uid}`);
      callback(local ? JSON.parse(local) : []);
      return () => {};
    }

    const q = query(collection(db, 'my_look_reports'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const reports: MyLookReport[] = [];
      snapshot.forEach((docSnap) => {
        reports.push({ id: docSnap.id, ...docSnap.data() } as MyLookReport);
      });
      reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(reports);
    }, (err) => {
      console.warn('MyLookReports snapshot fallback:', err);
      const local = localStorage.getItem(`syncmate_my_look_reports_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    const local = localStorage.getItem(`syncmate_my_look_reports_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function addMyLookReportToFirestore(report: Omit<MyLookReport, 'id' | 'createdAt'>): Promise<string> {
  try {
    const colRef = collection(db, 'my_look_reports');
    const docRef = await addDoc(colRef, {
      ...report,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('addMyLookReportToFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_my_look_reports_${report.userId}`);
    const existing: MyLookReport[] = local ? JSON.parse(local) : [];
    const newId = `my_look_${Date.now()}`;
    const newReport: MyLookReport = { ...report, id: newId, createdAt: new Date().toISOString() };
    existing.unshift(newReport);
    localStorage.setItem(`syncmate_my_look_reports_${report.userId}`, JSON.stringify(existing));
    return newId;
  }
}

// Habits Firestore Operations
export function subscribeUserHabits(uid: string, callback: (habits: any[]) => void) {
  try {
    if (!auth.currentUser || uid.startsWith('guest')) {
      const local = localStorage.getItem(`syncmate_habits_${uid}`);
      callback(local ? JSON.parse(local) : []);
      return () => {};
    }

    const q = query(collection(db, 'habits'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const habits: any[] = [];
      snapshot.forEach((docSnap) => {
        habits.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(habits);
    }, (err) => {
      console.warn('Habits snapshot fallback:', err);
      const local = localStorage.getItem(`syncmate_habits_${uid}`);
      callback(local ? JSON.parse(local) : []);
    });
  } catch (err) {
    const local = localStorage.getItem(`syncmate_habits_${uid}`);
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
}

export async function addHabitToFirestore(userId: string, habit: { name: string; count: number; lastCompletedDate?: string }): Promise<string> {
  try {
    const colRef = collection(db, 'habits');
    const docRef = await addDoc(colRef, {
      ...habit,
      userId,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn('addHabitToFirestore fallback:', err);
    const local = localStorage.getItem(`syncmate_habits_${userId}`);
    const existing: any[] = local ? JSON.parse(local) : [];
    const newHabit = { ...habit, id: `habit_${Date.now()}`, userId };
    existing.push(newHabit);
    localStorage.setItem(`syncmate_habits_${userId}`, JSON.stringify(existing));
    return newHabit.id;
  }
}

export async function updateHabitInFirestore(id: string, userId: string, updates: any): Promise<void> {
  try {
    if (!id.startsWith('habit_local_')) {
      const docRef = doc(db, 'habits', id);
      await updateDoc(docRef, updates);
    }
  } catch (err) {
    console.warn('updateHabitInFirestore fallback:', err);
  } finally {
    const local = localStorage.getItem(`syncmate_habits_${userId}`);
    if (local) {
      let existing: any[] = JSON.parse(local);
      existing = existing.map(h => h.id === id ? { ...h, ...updates } : h);
      localStorage.setItem(`syncmate_habits_${userId}`, JSON.stringify(existing));
    }
  }
}

