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
import { UserProfile, Task, Project } from '../types';

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
