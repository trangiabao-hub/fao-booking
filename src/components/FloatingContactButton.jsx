import React from "react";
import { motion } from "framer-motion";
import { PhoneIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

const ZALO_LINK = "https://zalo.me/0901355198";
const PHONE_NUMBER = "0901355198";

export default function FloatingContactButton() {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-20 flex flex-col items-end gap-2">
      {/* Expanded Options */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          className="flex flex-col gap-2"
        >
          <a
            href={ZALO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            <span className="text-sm font-semibold">Chat Zalo</span>
          </a>
          
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-95"
          >
            <PhoneIcon className="w-5 h-5" />
            <span className="text-sm font-semibold">{PHONE_NUMBER}</span>
          </a>
        </motion.div>
      )}
      
      {/* Main Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
          isExpanded
            ? "bg-slate-700 shadow-slate-700/30"
            : "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/30"
        }`}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <PhoneIcon className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>
      
      {/* Pulse Animation when not expanded */}
      {!isExpanded && (
        <motion.div
          className="absolute inset-0 rounded-full bg-pink-500"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ zIndex: -1 }}
        />
      )}
    </div>
  );
}
