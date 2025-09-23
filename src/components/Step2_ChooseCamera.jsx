// src/components/Step2_ChooseCamera.jsx
import React from 'react';
import { cameras } from '../data/cameras';

const Step2_ChooseCamera = ({ selectedOption, onSelectCamera, selectedCamera }) => {
  const availableCameras = cameras[selectedOption] || [];

  return (
    <div className="p-8 bg-white rounded-lg shadow-xl max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">2. Chọn máy ảnh của bạn</h2>
      {availableCameras.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">Không có máy ảnh nào cho loại này.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCameras.map((camera) => (
            <div
              key={camera.id}
              onClick={() => onSelectCamera(camera)}
              className={`flex flex-col items-center p-6 border-2 rounded-lg transition-all duration-300 cursor-pointer
                ${selectedCamera?.id === camera.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'}
                focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              <img src={camera.image} alt={camera.name} className="w-full h-40 object-cover rounded-md mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{camera.name}</h3>
              <p className="text-lg text-gray-600">{camera.pricePerDay.toLocaleString('vi-VN')} VNĐ/ngày</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Step2_ChooseCamera;