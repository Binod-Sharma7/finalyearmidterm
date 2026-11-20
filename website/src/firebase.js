import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Replace these placeholders with your Firebase web app configuration.
// Keep ESP32 Wi-Fi and private credentials out of this file.
const firebaseConfig = {
  apiKey: "AIzaSyDBu-iAarwIEwoc2VrdYQZrJ91i6jv9eJA",
  authDomain: "finalyearmidterm.firebaseapp.com",
  databaseURL: "https://finalyearmidterm-default-rtdb.firebaseio.com",
  projectId: "finalyearmidterm",
  storageBucket: "finalyearmidterm.firebasestorage.app",
  messagingSenderId: "505574271600",
  appId: "1:505574271600:web:2b78411b25e187e997e2b5",
  measurementId: "G-TR030R5XP3"
};
const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
