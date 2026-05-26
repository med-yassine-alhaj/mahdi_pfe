import { getApp, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA73CubqAyM5AtIGNibDxA2mMqnxczT7LM",
  authDomain: "mahdi-pfe.firebaseapp.com",
  projectId: "mahdi-pfe",
  storageBucket: "mahdi-pfe.firebasestorage.app",
  messagingSenderId: "625428199700",
  appId: "1:625428199700:web:e10f193c66adf6f1cdaa01",
  measurementId: "G-MQK0C03WCJ",
  databaseURL: "https://mahdi-pfe-default-rtdb.europe-west1.firebasedatabase.app/",
};

export const firebaseClient = initializeApp(firebaseConfig);

export const databaseClient = getFirestore(firebaseClient);

export const realTimeDB = getDatabase(firebaseClient);

export const authClient = getAuth(firebaseClient);

// Instance secondaire utilisée pour modifier les credentials d'un agent
// sans déconnecter le superviseur connecté
const secondaryApp = (() => {
  try { return getApp("secondary"); } catch { return initializeApp(firebaseConfig, "secondary"); }
})();
export const secondaryAuth = getAuth(secondaryApp);
