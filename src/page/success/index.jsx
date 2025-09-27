import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import vi from "date-fns/locale/vi";
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios"; // Đảm bảo bạn đã có file này

const FALLBACK_IMG = "https://placehold.co/640x360/png?text=No+Image";

function SuccessCard({ details }) {
  const handleAddToCalendar = () => {
    if (!details) return;

    const formatGCALDate = (dateStr) => {
      // Input can be a Date object or an ISO string
      return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, "");
    };

    const title = `Thuê máy ảnh: ${details.device.name}`;
    const startTime = formatGCALDate(details.bookingFrom);
    const endTime = formatGCALDate(details.bookingTo);
    const description = `Cảm ơn bạn đã đặt lịch thuê máy ảnh!\n\nMã đơn hàng: ${
      details.orderCode
    }\nTổng tiền: ${details.total.toLocaleString(
      "vi-VN"
    )} đ\n\nVui lòng có mặt đúng giờ để nhận máy.\nLiên hệ: 09xx.xxx.xxx`;
    const location = "Tiệm Xinh, 123 Đường ABC, Quận 1, TP. HCM";

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${startTime}/${endTime}&details=${encodeURIComponent(
      description
    )}&location=${encodeURIComponent(location)}`;

    window.open(url, "_blank");
  };

  if (!details) {
    return <LoadingState message="Đang tải chi tiết đơn hàng..." />;
  }

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 p-6 text-center">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold text-pink-800 mt-4">
        Thanh toán thành công!
      </h2>
      <p className="text-slate-600 mt-2">
        Cảm ơn bạn đã tin tưởng. Tụi mình đã nhận được lịch đặt của bạn.
      </p>

      <div className="text-left bg-pink-50 rounded-xl p-4 mt-6 space-y-3">
        <h3 className="font-semibold text-pink-900 border-b border-pink-200 pb-2 mb-2">
          Chi tiết đơn hàng
        </h3>
        <div className="flex items-center gap-4">
          <img
            src={details.device.img}
            alt={details.device.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <p className="font-semibold text-pink-800">{details.device.name}</p>
            <p className="text-sm text-slate-500">
              Mã đơn: {details.orderCode}
            </p>
          </div>
        </div>
        <div className="text-sm space-y-1 pt-2">
          <p>
            <b>Nhận máy:</b>{" "}
            {format(new Date(details.bookingFrom), "HH:mm, EEEE, dd/MM/yyyy", {
              locale: vi,
            })}
          </p>
          <p>
            <b>Trả máy:</b>{" "}
            {format(new Date(details.bookingTo), "HH:mm, EEEE, dd/MM/yyyy", {
              locale: vi,
            })}
          </p>
          <p>
            <b>Tổng tiền:</b>{" "}
            <span className="font-bold text-pink-600">
              {details.total.toLocaleString("vi-VN")} đ
            </span>
          </p>
        </div>
      </div>

      <button
        onClick={handleAddToCalendar}
        className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-pink-600 text-white font-semibold shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
      >
        <CalendarIcon className="w-5 h-5" />
        Thêm vào Lịch Google
      </button>
    </div>
  );
}

function FailureCard() {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 p-6 text-center">
      <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
      <h2 className="text-2xl font-bold text-pink-800 mt-4">
        Thanh toán thất bại
      </h2>
      <p className="text-slate-600 mt-2">
        Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
      </p>
      <Link
        to="/booking"
        className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
      >
        <ArrowUturnLeftIcon className="w-5 h-5" />
        Thử lại
      </Link>
    </div>
  );
}

function LoadingState({ message }) {
  return (
    <div className="text-center py-20">
      <p className="text-pink-700 font-medium">{message}</p>
      <div className="mt-4 h-2 w-32 bg-pink-100 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 animate-pulse w-full"></div>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      const code = searchParams.get("code");
      const orderCode = searchParams.get("orderCode");
      const paymentStatus = searchParams.get("status");

      if (code === "00" && orderCode && paymentStatus === "PAID") {
        try {
          // 1. Lấy thông tin booking chính
          const bookingRes = await api.get(`/v1/bookings/booking/${orderCode}`);
          const bookingData = bookingRes.data;

          // 2. Parse chuỗi JSON để lấy deviceId và các thông tin khác
          const payload = JSON.parse(bookingData.bookingPayloadJson);

          // 3. Dùng deviceId để lấy thông tin chi tiết của thiết bị
          const deviceRes = await api.get(`/v1/devices/${payload.deviceId}`);
          const deviceData = deviceRes.data;

          // 4. Kết hợp dữ liệu từ 2 API call
          const finalDetails = {
            orderCode: bookingData.orderCode,
            bookingFrom: new Date(payload.bookingFrom), // Chuyển timestamp thành Date object
            bookingTo: new Date(payload.bookingTo), // Chuyển timestamp thành Date object
            total: payload.total,
            device: {
              name: deviceData.name,
              img: deviceData.images?.[0] || FALLBACK_IMG,
            },
          };

          setBookingDetails(finalDetails);
          setStatus("success");
        } catch (error) {
          console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
          setStatus("failed"); // Nếu có bất kỳ lỗi nào trong quá trình lấy dữ liệu, coi như thất bại
        }
      } else {
        setStatus("failed");
      }
    };

    fetchBookingDetails();
  }, [searchParams]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100">
      <div className="max-w-md mx-auto px-4 py-16">
        {status === "checking" && (
          <LoadingState message="Đang kiểm tra trạng thái thanh toán..." />
        )}
        {status === "success" && <SuccessCard details={bookingDetails} />}
        {status === "failed" && <FailureCard />}
      </div>
    </div>
  );
}
