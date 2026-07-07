import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";
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
/** 伝票アプリのログイン状態と混ざらないよう、このタブ内だけ保持 */
export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
export const db = getFirestore(app);
