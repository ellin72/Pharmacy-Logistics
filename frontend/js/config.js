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

// Enable Firestore offline persistence for clinic reliability
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open; persistence only works in one tab at a time
    console.warn('Firestore persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // Browser does not support persistence
    console.warn('Firestore persistence not supported in this browser.');
  } else {
    console.error('Firestore persistence error:', err);
  }
});

// Global error handler to suppress harmless browser extension errors
window.addEventListener('error', (event) => {
  // Suppress browser extension communication errors
  if (event.message && (
    event.message.includes('message channel closed') ||
    event.message.includes('listener indicated an asynchronous response') ||
    event.message.includes('Extension context invalidated')
  )) {
    event.preventDefault();
    event.stopPropagation();
    // Silently ignore - these are harmless browser extension errors
    return false;
  }
});

// Handle unhandled promise rejections (for async errors)
window.addEventListener('unhandledrejection', (event) => {
  // Suppress browser extension promise rejection errors
  if (event.reason && typeof event.reason === 'object' && event.reason.message) {
    const message = event.reason.message;
    if (message.includes('message channel closed') ||
        message.includes('listener indicated an asynchronous response') ||
        message.includes('Extension context invalidated')) {
      event.preventDefault();
      // Silently ignore - these are harmless browser extension errors
      return;
    }
  }
  
  // Also check if it's a string error
  if (typeof event.reason === 'string') {
    if (event.reason.includes('message channel closed') ||
        event.reason.includes('listener indicated an asynchronous response')) {
      event.preventDefault();
      return;
    }
  }
});

