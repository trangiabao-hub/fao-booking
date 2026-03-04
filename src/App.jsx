import React from "react";
import PropTypes from "prop-types";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./page/home";
import DeviceCatalogPage from "./page/catalog";
import BookingPage from "./page/booking";
import PaymentStatusPage from "./page/success";
import OrderInfoPage from "./page/order-info";
import Menu from "./page/menu";
import PhotoBoothPage from "./page/photobooth";

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <HomePage />,
    },
    {
      path: "/catalog",
      element: <DeviceCatalogPage />,
    },
    {
      path: "/booking",
      element: <BookingPage />,
    },
    {
      path: "/payment-status",
      element: <PaymentStatusPage />,
    },
    {
      path: "/order/:orderIdNew",
      element: <OrderInfoPage />,
    },
    {
      path: "/menu",
      element: <Menu />,
    },
    {
      path: "/photobooth",
      element: <PhotoBoothPage />,
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
