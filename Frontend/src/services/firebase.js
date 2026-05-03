// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCjl4g89iS1WWNf2BToXpCQwwxN8WGALP0",
  authDomain: "luct-app.firebaseapp.com",
  projectId: "luct-app",
  storageBucket: "luct-app.firebasestorage.app",
  messagingSenderId: "484445864701",
  appId: "1:484445864701:web:26f8ee3e1b2236c34c7494",
  measurementId: "G-1663NNW1KQ"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

export const collections = {
  users: 'users',
  courses: 'courses',
  classes: 'classes',
  attendance: 'attendance',
  ratings: 'ratings',
  reports: 'reports',
  modules: 'modules'
};

export const dbService = {
  async create(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return { id: docRef.id, success: true };
    } catch (error) {
      console.error(`Error creating in ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  async getById(collectionName, id) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Document not found' };
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  async getAll(collectionName, filters = [], orderByField = null, orderDirection = 'asc') {
    try {
      let q = collection(db, collectionName);
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: items };
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      return { success: false, error: error.message, data: [] };
    }
  },

  async update(collectionName, id, data) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error(`Error updating in ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  async set(collectionName, id, data) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error(`Error setting in ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  async delete(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },
};