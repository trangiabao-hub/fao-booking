import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB4KXxNX7sZrBsIlKnPEJDLPPi1JoqvcV4",
  authDomain: "notification-6c96d.firebaseapp.com",
  projectId: "notification-6c96d",
  storageBucket: "notification-6c96d.firebasestorage.app",
  messagingSenderId: "581573831663",
  appId: "1:581573831663:web:9d560b65665aa85afba41a",
  measurementId: "G-DVECQJ7HWV",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
