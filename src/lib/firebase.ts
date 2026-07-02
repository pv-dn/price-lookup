import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRvXOmLV_iU9ybzJrquJSglUYfEON_CsM",
  authDomain: "pourvoussystem.firebaseapp.com",
  projectId: "pourvoussystem",
  storageBucket: "pourvoussystem.firebasestorage.app",
  messagingSenderId: "505648740877",
  appId: "1:505648740877:web:f5b0c3a950866ce74bb344",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
