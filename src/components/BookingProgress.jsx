import React from "react";
import { motion } from "framer-motion";
import { Calendar, User, CreditCard, Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Chọn ngày", icon: Calendar },
  { id: 2, label: "Thông tin", icon: User },
  { id: 3, label: "Thanh toán", icon: CreditCard },
];

export default function BookingProgress({ currentStep = 1 }) {
  return (
    <div className="bg-[#222] border-b border-[#333] py-4">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#444] mx-8" />
          
          {/* Progress Line Active */}
          <motion.div
            className="absolute top-5 left-0 h-0.5 bg-[#FF9FCA] mx-8"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />

          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#FF9FCA] text-[#222]"
                      : isActive
                      ? "bg-[#FF9FCA] text-[#222] shadow-lg shadow-[#FF9FCA]/40"
                      : "bg-[#333] text-[#666] border border-[#444]"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    <Icon size={18} strokeWidth={2} />
                  )}
                </motion.div>
                <span
                  className={`mt-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive || isCompleted ? "text-[#FF9FCA]" : "text-[#666]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
