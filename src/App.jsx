import React from "react";
import PropTypes from "prop-types";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./page/home";
import BookingPage from "./page/booking";
import PaymentStatusPage from "./page/success";
import Menu from "./page/menu";

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <HomePage />,
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
      path: "/menu",
      element: <Menu />,
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
