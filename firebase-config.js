import { initializeApp } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyA-3WJn73F3kdc8nLFjHPiBTQqKTXXXi_4",
  authDomain: "://firebaseapp.com",
  projectId: "tactile-wars",
  storageBucket: "tactile-wars.firebasestorage.app",
  messagingSenderId: "352492746252",
  appId: "1:352492746252:web:a075c2d85ff5d2e97da029",
  measurementId: "G-CV4B3WCJVP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
