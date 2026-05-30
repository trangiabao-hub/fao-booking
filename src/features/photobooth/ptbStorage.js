const PTB_SESSION_PREFIX = "fao_ptb_session_";
const PTB_NAME_PREFIX = "fao_ptb_name_";

export function getPtbSession(shareToken) {
  if (!shareToken) return null;
  try {
    return localStorage.getItem(`${PTB_SESSION_PREFIX}${shareToken}`);
  } catch {
    return null;
  }
}

export function savePtbSession(shareToken, sessionToken, displayName) {
  if (!shareToken || !sessionToken) return;
  try {
    localStorage.setItem(`${PTB_SESSION_PREFIX}${shareToken}`, sessionToken);
    if (displayName) {
      localStorage.setItem(`${PTB_NAME_PREFIX}${shareToken}`, displayName);
    }
  } catch {
    /* ignore */
  }
}

export function getPtbDisplayName(shareToken) {
  if (!shareToken) return "";
  try {
    return localStorage.getItem(`${PTB_NAME_PREFIX}${shareToken}`) || "";
  } catch {
    return "";
  }
}

export function clearPtbSession(shareToken) {
  if (!shareToken) return;
  try {
    localStorage.removeItem(`${PTB_SESSION_PREFIX}${shareToken}`);
    localStorage.removeItem(`${PTB_NAME_PREFIX}${shareToken}`);
  } catch {
    /* ignore */
  }
}
