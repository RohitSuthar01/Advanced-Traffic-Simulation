import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyA0nV9X4tyar3w1GuShuvth0DT5Sz3KVFk",
  authDomain: "advanced-traffic-simulat-d8be3.firebaseapp.com",
  projectId: "advanced-traffic-simulat-d8be3",
  storageBucket: "advanced-traffic-simulat-d8be3.firebasestorage.app",
  messagingSenderId: "322223639174",
  appId: "1:322223639174:web:dcb7869ca964eb13d95f07",
  databseURL: "https://advanced-traffic-simulat-d8be3-default-rtdb.firebaseio.com"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();