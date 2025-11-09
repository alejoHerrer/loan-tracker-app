// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfigDev } from "./firebase.dev";
import { firebaseConfigProd } from "./firebase.prod";

// Determine environment
const isProduction = process.env.NODE_ENV === "production";

// Select configuration based on environment
const firebaseConfig = isProduction ? firebaseConfigProd : firebaseConfigDev;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);