import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import HomePage from "./page/home";
import DeviceCatalogPage from "./page/catalog";
import PaymentStatusPage from "./page/success";
import OrderInfoPage from "./page/order-info";
import AccountBookingsPage from "./page/account-bookings";
import AccountPage from "./page/account";
import Menu from "./page/menu";
import PhotoBoothPage from "./page/photobooth";
import AlbumPage from "./page/album";
import TripAlbumPage from "./ptb/pages/TripAlbumPage";
import GuestFramePage from "./ptb/pages/GuestFramePage";
import AlbumOrderRedirect from "./ptb/pages/AlbumOrderRedirect";
import FeedbackPage from "./page/feedback";
import RentalContractSamplePage from "./page/rental-contract-sample";
import RentalRulesPage from "./page/rental-rules";
import PrivacyPolicyPage from "./page/privacy-policy";
import ShortLinkRedirect from "./page/short-link";
import SeoMeta from "./components/SeoMeta";
import AnalyticsShell from "./components/AnalyticsShell";

const App = () => {
  const router = createBrowserRouter([
    {
      element: <AnalyticsShell />,
      children: [
    {
      path: "/",
      element: (
        <SeoMeta
          title="Thuê máy ảnh TP.HCM — đặt online nhanh"
          description="Thuê máy ảnh TP.HCM tại FAO — Fujifilm, Sony, Canon, DJI. Giá sinh viên từ 150k/ngày, chi nhánh Phú Nhuận & Thủ Đức. Đặt lịch online realtime."
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
      path: "/l/:code",
      element: (
        <SeoMeta
          title="Đang mở link…"
          description="Chuyển tới catalog FAO Camera."
          path="/l"
          noindex
        >
          <ShortLinkRedirect />
        </SeoMeta>
      ),
    },
    {
      path: "/booking",
      element: <Navigate to="/catalog" replace />,
    },
    {
      path: "/q9",
      element: <Navigate to="/catalog?branchId=Q9" replace />,
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
          title="Photobooth — Tặng 2 ảnh in khi thuê máy"
          description="Thuê máy ảnh FAO — ghép ảnh photobooth online, nhận 2 strip in miễn phí khi trả máy. Khung độc quyền, không phai màu."
          path="/photobooth"
        >
          <PhotoBoothPage />
        </SeoMeta>
      ),
    },
    {
      path: "/trip/:shareToken",
      element: (
        <SeoMeta
          title="Album ảnh chuyến đi"
          description="Ghép ảnh photobooth và đặt in cho chuyến thuê máy ảnh tại FAO."
          path="/trip"
          noindex
        >
          <TripAlbumPage />
        </SeoMeta>
      ),
    },
    {
      path: "/frame/:shareToken",
      element: (
        <SeoMeta
          title="Ghép frame · in ngay"
          description="Link tạm ghép frame và in photobooth tại FAO."
          path="/frame"
          noindex
        >
          <GuestFramePage />
        </SeoMeta>
      ),
    },
    {
      path: "/album",
      element: (
        <SeoMeta
          title="Album của tôi"
          description="Xem lại toàn bộ ảnh photobooth bạn đã ghép tại FAO, lưu về máy hoặc gửi shop in."
          path="/album"
          noindex
        >
          <AlbumPage />
        </SeoMeta>
      ),
    },
    {
      path: "/album/order/:orderIdNew",
      element: (
        <SeoMeta
          title="Mở album chuyến đi"
          description="Album ảnh cho đơn thuê máy ảnh FAO."
          path="/album"
          noindex
        >
          <AlbumOrderRedirect />
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
    {
      path: "/hop-dong-thue-chuan",
      element: <RentalContractSamplePage />,
    },
    {
      path: "/quy-dinh-thue-may",
      element: <RentalRulesPage />,
    },
    {
      path: "/chinh-sach-quyen-rieng-tu",
      element: <PrivacyPolicyPage />,
    },
    {
      path: "/privacy-policy",
      element: <Navigate to="/chinh-sach-quyen-rieng-tu" replace />,
    },
      ],
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
