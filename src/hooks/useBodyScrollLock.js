import { useEffect } from "react";

/**
 * Khóa scroll trang khi mở modal / bottom sheet.
 *
 * iOS Safari bỏ qua `overflow: hidden` trên body nên phải `position: fixed`
 * kèm bù `top` bằng vị trí scroll hiện tại, rồi trả lại đúng chỗ khi đóng.
 * Đếm số lớp đang mở để modal lồng nhau không mở khóa sớm.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles = null;

function applyLock() {
  const { body } = document;
  savedScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  savedStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  // Bù chỗ scrollbar desktop để trang không giật ngang khi mở modal.
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function releaseLock() {
  if (!savedStyles) return;
  const { body } = document;
  body.style.position = savedStyles.position;
  body.style.top = savedStyles.top;
  body.style.left = savedStyles.left;
  body.style.right = savedStyles.right;
  body.style.width = savedStyles.width;
  body.style.overflow = savedStyles.overflow;
  body.style.paddingRight = savedStyles.paddingRight;
  savedStyles = null;
  window.scrollTo(0, savedScrollY);
}

export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount += 1;
    if (lockCount === 1) applyLock();

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
