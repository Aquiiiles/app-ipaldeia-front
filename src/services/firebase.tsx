import { initializeApp } from 'firebase/app';
// NOTE: on native, `firebase/auth` is redirected to `@firebase/auth` (the RN
// build) by metro.config.js. That is required because the `firebase/auth`
// wrapper only ships the browser build, which in Firebase v12 no longer exports
// `getReactNativePersistence` — importing it there yields `undefined`, and
// calling it crashes the app on launch. The redirect also keeps the ENTIRE app
// on a single auth build (all other files import from `firebase/auth` too), so
// the `auth` instance and functions like `onAuthStateChanged` match. On web the
// wrapper is used as-is (the `getAuth` path below).
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  // @ts-ignore - only present in the react-native build; undefined (and unused) on web
  getReactNativePersistence,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
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
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Firestore persistent (on-disk) cache relies on IndexedDB, which only exists on
// web. On native the JS SDK must use the default in-memory cache, so we only opt
// into the persistent cache on web.
export const db =
  Platform.OS === 'web'
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
export { auth };
