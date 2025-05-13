// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyATRd0aMQKxD6NTNzjOWWdNr7PsibUnG8g",
  authDomain: "competition-e7871.firebaseapp.com",
  databaseURL: "https://competition-e7871-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "competition-e7871",
  storageBucket: "competition-e7871.firebasestorage.app",
  messagingSenderId: "939060318935",
  appId: "1:939060318935:web:3bb534e2e5e9a536935692"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
