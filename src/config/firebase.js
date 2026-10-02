import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from "firebase/auth";

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

// indexedDB trụ tốt hơn sessionStorage mặc định của getAuth() — tránh lỗi
// "missing initial state" khi Safari / in-app browser phân vùng storage.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  // HMR / hot reload: app đã init Auth rồi.
  auth = getAuth(app);
}
export { auth };
export const googleProvider = new GoogleAuthProvider();
