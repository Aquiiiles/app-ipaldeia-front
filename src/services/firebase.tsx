import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBmrFDumiAvUX-lUeVfw977a8N5dsQLC6A',
  authDomain: 'igreja-app-2e273.firebaseapp.com',
  projectId: 'igreja-app-2e273',
  storageBucket: 'igreja-app-2e273.firebasestorage.app',
  messagingSenderId: '905093072048',
  appId: '1:905093072048:web:ff1fd2ae0d751e1b796775',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
