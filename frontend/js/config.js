// Firebase Configuration
// Replace these values with your Firebase project config
// Get this from: Firebase Console → Project Settings → Your apps

const firebaseConfig = {
  apiKey: "AIzaSyCxQdx6F6sVLFikwX_3WcNub18xfP4wRQg",
  authDomain: "ehafo-pharmacy-logistics-3ca06.firebaseapp.com",
  projectId: "ehafo-pharmacy-logistics-3ca06",
  storageBucket: "ehafo-pharmacy-logistics-3ca06.firebasestorage.app",
  messagingSenderId: "546090396793",
  appId: "1:546090396793:web:4df5ef2f2a555e63c8f8a8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Firestore settings (for offline support - optional)
// db.enablePersistence().catch((err) => {
//   console.log('Persistence failed:', err);
// });

