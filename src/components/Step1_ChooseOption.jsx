// src/components/Step1_ChooseOption.jsx
import React from 'react';

const Step1_ChooseOption = ({ onSelectOption, selectedOption }) => {
  const options = [
    { id: 'canon', name: 'Thuê máy Canon', icon: '📸' },
    { id: 'fuji', name: 'Thuê máy Fuji', icon: '📷' },
    { id: 'pocket', name: 'Thuê Pocket', icon: '📱' },
  ];

  return (
    <div className="p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">1. Chọn loại máy ảnh</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id)}
            className={`flex flex-col items-center p-6 border-2 rounded-lg transition-all duration-300
              ${selectedOption === option.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'}
              focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            <span className="text-5xl mb-3">{option.icon}</span>
            <span className="text-xl font-semibold text-gray-700">{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Step1_ChooseOption;