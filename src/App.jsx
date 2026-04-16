import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { BRANCHES } from "./data/bookingConstants";
import HomePage from "./page/home";
import DeviceCatalogPage from "./page/catalog";
import BookingPage from "./page/booking";
import PaymentStatusPage from "./page/success";
import OrderInfoPage from "./page/order-info";
import AccountBookingsPage from "./page/account-bookings";
import AccountPage from "./page/account";
import Menu from "./page/menu";
import PhotoBoothPage from "./page/photobooth";
import FeedbackPage from "./page/feedback";
import SeoMeta from "./components/SeoMeta";
import AnalyticsShell from "./components/AnalyticsShell";

function Q9BookingEntry() {
  const q9 = BRANCHES.find((b) => b.id === "Q9");
  if (q9?.disabled) {
    return <Navigate to="/booking" replace />;
  }
  return (
    <SeoMeta
      title="Đặt lịch FAO Q9 (Thủ Đức)"
      description="Đặt thuê máy ảnh tại FAO Q9 Vinhomes Grand Park — mặc định nhận trả Thủ Đức."
      path="/q9"
    >
      <BookingPage />
    </SeoMeta>
  );
}

const App = () => {
  const router = createBrowserRouter([
    {
      element: <AnalyticsShell />,
      children: [
    {
      path: "/",
      element: (
        <SeoMeta
          title="Đặt máy ảnh và ống kính"
          description="Đặt thuê máy ảnh, ống kính và phụ kiện nhanh chóng tại FAO với lịch trống minh bạch và thanh toán thuận tiện."
          path="/"
        >
          <HomePage />
        </SeoMeta>
      ),
    },
    {
      path: "/catalog",
      element: (
        <SeoMeta
          title="Danh mục thiết bị"
          description="Xem danh mục máy ảnh, ống kính và phụ kiện tại FAO, so sánh thông số và chọn thiết bị phù hợp cho lịch quay chụp."
          path="/catalog"
        >
          <DeviceCatalogPage />
        </SeoMeta>
      ),
    },
    {
      path: "/booking",
      element: (
        <SeoMeta
          title="Đặt lịch thuê thiết bị"
          description="Chọn thời gian thuê, chi nhánh và thông tin nhận trả thiết bị trong vài bước tại FAO Booking."
          path="/booking"
        >
          <BookingPage />
        </SeoMeta>
      ),
    },
    {
      path: "/q9",
      element: <Q9BookingEntry />,
    },
    {
      path: "/payment-status",
      element: (
        <SeoMeta
          title="Trạng thái thanh toán"
          description="Theo dõi kết quả thanh toán đơn thuê thiết bị tại FAO."
          path="/payment-status"
          noindex
        >
          <PaymentStatusPage />
        </SeoMeta>
      ),
    },
    {
      path: "/order/code/:orderCode",
      element: (
        <SeoMeta
          title="Thông tin đơn hàng"
          description="Tra cứu chi tiết đơn thuê thiết bị tại FAO."
          path="/order"
          noindex
        >
          <OrderInfoPage />
        </SeoMeta>
      ),
    },
    {
      path: "/order/booking/:bookingId",
      element: (
        <SeoMeta
          title="Thông tin đơn hàng"
          description="Chi tiết đơn thuê thiết bị tại FAO."
          path="/order"
          noindex
        >
          <OrderInfoPage />
        </SeoMeta>
      ),
    },
    {
      path: "/order/:orderIdNew",
      element: (
        <SeoMeta
          title="Thông tin đơn hàng"
          description="Tra cứu chi tiết đơn thuê thiết bị tại FAO."
          path="/order"
          noindex
        >
          <OrderInfoPage />
        </SeoMeta>
      ),
    },
    {
      path: "/my-bookings",
      element: (
        <SeoMeta
          title="Đơn của tôi"
          description="Đăng nhập và quản lý các đơn thuê thiết bị của bạn tại FAO."
          path="/my-bookings"
          noindex
        >
          <AccountBookingsPage />
        </SeoMeta>
      ),
    },
    {
      path: "/account",
      element: (
        <SeoMeta
          title="Tài khoản thành viên"
          description="Xem điểm tích lũy và hạng thành viên FAO của bạn."
          path="/account"
          noindex
        >
          <AccountPage />
        </SeoMeta>
      ),
    },
    {
      path: "/menu",
      element: (
        <SeoMeta
          title="Menu dịch vụ"
          description="Khám phá các dịch vụ chụp hình và gói trải nghiệm tại FAO."
          path="/menu"
        >
          <Menu />
        </SeoMeta>
      ),
    },
    {
      path: "/photobooth",
      element: (
        <SeoMeta
          title="Photo Booth"
          description="Đặt lịch trải nghiệm Photo Booth tại FAO với quy trình nhanh gọn."
          path="/photobooth"
        >
          <PhotoBoothPage />
        </SeoMeta>
      ),
    },
    {
      path: "/feedback",
      element: (
        <SeoMeta
          title="Feedback khách thuê máy"
          description="Xem feedback thực tế theo từng dòng máy ảnh tại FAO để chọn máy phù hợp và đặt nhanh."
          path="/feedback"
        >
          <FeedbackPage />
        </SeoMeta>
      ),
    },
      ],
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
