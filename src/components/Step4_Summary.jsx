// src/components/Step4_Summary.jsx
import React from "react";

const Step4_Summary = ({
  selectedOption,
  selectedCamera,
  startDate,
  endDate,
}) => {
  const calculateRentalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 để tính cả ngày trả
    return diffDays;
  };

  const rentalDays = calculateRentalDays();
  const totalCost = selectedCamera
    ? selectedCamera.pricePerDay * rentalDays
    : 0;

  return (
    <div className="p-8 bg-white rounded-lg shadow-xl max-w-xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        4. Tổng kết đơn hàng
      </h2>

      {selectedCamera ? (
        <div className="space-y-5 text-gray-700">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Loại máy:</span>
            <span className="text-lg capitalize">{selectedOption}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Máy ảnh:</span>
            <span className="text-lg">{selectedCamera.name}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Giá thuê / ngày:</span>
            <span className="text-lg">
              {selectedCamera.pricePerDay.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Ngày nhận:</span>
            <span className="text-lg">
              {startDate
                ? new Date(startDate).toLocaleDateString("vi-VN")
                : "Chưa chọn"}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Ngày trả:</span>
            <span className="text-lg">
              {endDate
                ? new Date(endDate).toLocaleDateString("vi-VN")
                : "Chưa chọn"}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-lg font-medium">Số ngày thuê:</span>
            <span className="text-lg">{rentalDays} ngày</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t-2 border-indigo-200">
            <span className="text-2xl font-bold text-indigo-700">
              Tổng cộng:
            </span>
            <span className="text-2xl font-bold text-indigo-700">
              {totalCost.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">
          Vui lòng chọn máy ảnh để xem tổng kết.
        </p>
      )}
    </div>
  );
};

export default Step4_Summary;
