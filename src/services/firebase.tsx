import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBmrFDumiAvUX-lUeVfw977a8N5dsQLC6A',
  authDomain: 'igreja-app-2e273.firebaseapp.com',
  projectId: 'igreja-app-2e273',
  storageBucket: 'igreja-app-2e273.firebasestorage.app',
  messagingSenderId: '905093072048',
  appId: '1:905093072048:web:ff1fd2ae0d751e1b796775',
};

const app = initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { auth };
