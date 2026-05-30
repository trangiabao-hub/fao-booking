import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import HomePage from "./page/home";
import DeviceCatalogPage from "./page/catalog";
import PaymentStatusPage from "./page/success";
import OrderInfoPage from "./page/order-info";
import AccountBookingsPage from "./page/account-bookings";
import AccountPage from "./page/account";
import Menu from "./page/menu";
import InAnhIntroPage from "./page/in-anh";
import PhotoBoothPage from "./page/photobooth";
import CreatePhotoboothPage from "./features/photobooth/pages/CreatePhotoboothPage";
import RoomPhotoboothPage from "./features/photobooth/pages/RoomPhotoboothPage";
import FeedbackPage from "./page/feedback";
import RentalContractSamplePage from "./page/rental-contract-sample";
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
      path: "/in-anh",
      element: (
        <SeoMeta
          title="Photobooth miễn phí — FAO"
          description="Khách đặt lịch online: chọn khung, gắn ảnh, tải về hoặc in tại FAO."
          path="/in-anh"
        >
          <InAnhIntroPage />
        </SeoMeta>
      ),
    },
    {
      path: "/photobooth",
      element: (
        <SeoMeta
          title="Photobooth miễn phí — FAO"
          description="Khách đặt lịch online: chọn khung, gắn ảnh, tải về hoặc in tại FAO."
          path="/photobooth"
        >
          <PhotoBoothPage />
        </SeoMeta>
      ),
    },
    {
      path: "/photobooth/create",
      element: (
        <SeoMeta
          title="Tạo photobooth"
          description="Tạo strip ảnh photobooth và lưu vào đơn thuê máy FAO."
          path="/photobooth/create"
          noindex
        >
          <CreatePhotoboothPage />
        </SeoMeta>
      ),
    },
    {
      path: "/photobooth/room/:shareToken",
      element: (
        <SeoMeta
          title="Album photobooth nhóm"
          description="Cùng bạn bè tạo ảnh photobooth kỷ niệm chuyến đi."
          path="/photobooth/room"
          noindex
        >
          <RoomPhotoboothPage />
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
      ],
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
