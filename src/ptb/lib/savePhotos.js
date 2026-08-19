import { resolveMediaUrl } from "./frameUtils";

async function toFile(photo, index) {
  const src = resolveMediaUrl(photo?.imageUrl || photo?.thumbUrl);
  if (!src) throw new Error("Ảnh không hợp lệ");
  const res = await fetch(src);
  if (!res.ok) throw new Error("Không tải được ảnh từ máy chủ");
  const blob = await res.blob();
  const ext = blob.type === "image/jpeg" ? "jpg" : "png";
  return new File([blob], `faobooth-${index + 1}.${ext}`, {
    type: blob.type || "image/png",
  });
}

/**
 * Lưu ảnh về máy khách.
 *
 * Safari iOS chặn nhiều lần `<a download>` liên tiếp và cũng không cho ghi thẳng vào
 * thư viện Ảnh, trong khi share sheet lại có sẵn "Lưu vào Ảnh" — nên ưu tiên Web Share,
 * chỉ rơi về tải trực tiếp khi trình duyệt không hỗ trợ.
 *
 * @returns {Promise<{method: "share"|"download"|"cancelled", count: number}>}
 */
export async function savePhotosToDevice(photos = []) {
  const files = await Promise.all(photos.map(toFile));
  if (!files.length) return { method: "cancelled", count: 0 };

  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return { method: "share", count: files.length };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "cancelled", count: 0 };
      // Share hỏng vì lý do khác thì vẫn còn đường tải trực tiếp bên dưới.
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Chrome bỏ qua các lần tải cách nhau quá sát.
    await new Promise((resolve) => setTimeout(resolve, 350));
    URL.revokeObjectURL(url);
  }
  return { method: "download", count: files.length };
}
