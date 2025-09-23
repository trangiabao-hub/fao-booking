// src/components/Step3_SelectDates.jsx
import React from "react";

const Step3_SelectDates = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-8 bg-white rounded-lg shadow-xl max-w-xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
        3. Chọn ngày nhận và trả
      </h2>
      <div className="space-y-6">
        <div>
          <label
            htmlFor="startDate"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Ngày nhận:
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate || ""}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={today}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-lg"
          />
        </div>
        <div>
          <label
            htmlFor="endDate"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Ngày trả:
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate || ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate || today}
            disabled={!startDate}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default Step3_SelectDates;
