// src/firebaseConfig.ts
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBe2dSW0bioK81wuyQRKN-wYgX8vMP0gvo",
  authDomain: "fanscores.firebaseapp.com",
  projectId: "fanscores",
  storageBucket: "fanscores.firebasestorage.app",
  messagingSenderId: "331630707209",
  appId: "1:331630707209:web:c34a7a450065a4f96c6ed8",
  measurementId: "G-0R8TV1EYYR"
};

const app = initializeApp(firebaseConfig);

// 🌟 CRITICAL: Use ReactNativeAsyncStorage for Phone Auth persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);

export { auth, db };
