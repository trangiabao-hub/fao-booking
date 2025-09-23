// src/components/Stepper.jsx
import React from "react";

const Stepper = ({ currentStep, steps }) => {
  return (
    <div className="flex justify-center items-center py-8">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                ${
                  index === currentStep
                    ? "bg-indigo-600"
                    : index < currentStep
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
            >
              {index + 1}
            </div>
            <div
              className={`mt-2 text-sm ${
                index === currentStep
                  ? "text-indigo-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              {step}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 bg-gray-300 mx-4 ${
                index < currentStep ? "bg-green-300" : ""
              }`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;
