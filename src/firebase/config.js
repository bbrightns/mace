import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'exalted-outlet-04jp1',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:414755035856:web:df32fb055c720a65325cd5',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC2fFbA70dvarBCZjr4xiuTWEU1rzJO50E',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'exalted-outlet-04jp1.firebaseapp.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'exalted-outlet-04jp1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '414755035856',
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-a64fd741-04e7-42d0-99ca-e51867f555a6';

const app = initializeApp(firebaseConfig);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);


