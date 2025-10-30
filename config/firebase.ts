import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
    apiKey: "AIzaSyAm2eszbz6REigtaNIzjPDZ9QICEZny1lQ",
    authDomain: "stock-advisor-app.firebaseapp.com",
    projectId: "stock-advisor-app",
    storageBucket: "stock-advisor-app.firebasestorage.app",
    messagingSenderId: "202047707003",
    appId: "1:202047707003:web:d4cfe25c7914d4dfeacfde",
    measurementId: "G-SJVEJ292H4"
  };

// TODO: Replace YOUR_API_KEY_HERE and YOUR_APP_ID_HERE with actual values from Firebase Console
// 1. Go to Firebase Console > Project Settings
// 2. Scroll down to "Your apps" section
// 3. Copy the apiKey and appId from the config object

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;
