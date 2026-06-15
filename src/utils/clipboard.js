/**
 * Copy text vào clipboard với fallback execCommand cho webview cũ / ngữ cảnh không HTTPS.
 * Trả về true nếu copy thành công.
 */
export async function copyTextToClipboard(text) {
  const value = String(text ?? "");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* rơi xuống fallback bên dưới */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
