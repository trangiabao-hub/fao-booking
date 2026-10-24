import { auth } from "../config/firebase";
import api from "../config/axios";
import { saveCustomerSession } from "./storage";
import { consumeGoogleRedirect } from "./googleSignInEnvironment";

let pending = null;

/** Hoàn tất đăng nhập sau signInWithRedirect và ghi JWT của FAO. */
export function resumeGoogleLogin() {
  if (pending) return pending;
  pending = (async () => {
    const user = await consumeGoogleRedirect(auth);
    if (!user) return false;
    const res = await api.post("/login-gg", {
      email: user.email,
      name: user.displayName,
      avatar: user.photoURL,
      idToken: await user.getIdToken(),
    });
    const token = res?.data?.token;
    if (!token) return false;
    saveCustomerSession({ token });
    return true;
  })().catch((error) => {
    console.warn("Không khôi phục được phiên Google:", error);
    return false;
  });
  return pending;
}
