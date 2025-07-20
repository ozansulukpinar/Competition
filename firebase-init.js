// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDnbyxKFmrUcB-2Lx50aSYP7j-GpKMY170",
  authDomain: "competition-ae357.firebaseapp.com",
  databaseURL: "https://competition-ae357-default-rtdb.firebaseio.com",
  projectId: "competition-ae357",
  storageBucket: "competition-ae357.firebasestorage.app",
  messagingSenderId: "860924653040",
  appId: "1:860924653040:web:f9bdd5ee2f2dfdf1464135"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
