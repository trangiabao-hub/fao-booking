import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { resolveWsEndpoint } from "../config/apiBase";

const WS_ENDPOINT = resolveWsEndpoint();

let stompClient = null;
let subscriptions = {};
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 2000;

const eventListeners = {
  onBookingEvent: [],
  onConnect: [],
  onDisconnect: [],
};

export const connectSocket = () => {
  if (stompClient?.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      const socket = new SockJS(WS_ENDPOINT);

      stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          if (import.meta.env.DEV) {
            console.log("[WS]", str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log("[WS] Connected");
          reconnectAttempts = 0;
          subscribeToBookings();
          eventListeners.onConnect.forEach((cb) => cb());
          resolve();
        },

        onStompError: (frame) => {
          console.error("[WS] STOMP Error:", frame);
        },

        onWebSocketClose: () => {
          eventListeners.onDisconnect.forEach((cb) => cb());
          handleReconnect();
        },

        onWebSocketError: (error) => {
          console.error("[WS] Error:", error);
        },
      });

      stompClient.activate();
    } catch (error) {
      console.error("[WS] Connection error:", error);
      reject(error);
    }
  });
};

const subscribeToBookings = () => {
  if (!stompClient?.connected) return;

  const topic = "/topic/bookings";
  if (subscriptions[topic]) return;

  subscriptions[topic] = stompClient.subscribe(topic, (message) => {
    try {
      const event = JSON.parse(message.body);
      eventListeners.onBookingEvent.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error("[WS] Callback error:", err);
        }
      });
    } catch (error) {
      console.error("[WS] Parse error:", error);
    }
  });
};

const handleReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  reconnectAttempts++;
  const delay = Math.min(
    RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts - 1),
    30000,
  );

  setTimeout(() => {
    if (!stompClient?.connected) {
      connectSocket().catch(() => {});
    }
  }, delay);
};

export const disconnectSocket = () => {
  if (stompClient) {
    Object.values(subscriptions).forEach((sub) => {
      try { sub.unsubscribe(); } catch (_) { /* noop */ }
    });
    subscriptions = {};
    stompClient.deactivate();
    stompClient = null;
  }
};

export const isConnected = () => stompClient?.connected ?? false;

export const onBookingEvent = (callback) => {
  eventListeners.onBookingEvent.push(callback);
  return () => {
    const idx = eventListeners.onBookingEvent.indexOf(callback);
    if (idx > -1) eventListeners.onBookingEvent.splice(idx, 1);
  };
};

export const onConnect = (callback) => {
  eventListeners.onConnect.push(callback);
  return () => {
    const idx = eventListeners.onConnect.indexOf(callback);
    if (idx > -1) eventListeners.onConnect.splice(idx, 1);
  };
};

export const onDisconnect = (callback) => {
  eventListeners.onDisconnect.push(callback);
  return () => {
    const idx = eventListeners.onDisconnect.indexOf(callback);
    if (idx > -1) eventListeners.onDisconnect.splice(idx, 1);
  };
};

export const reconnect = () => {
  disconnectSocket();
  reconnectAttempts = 0;
  return connectSocket();
};

export default {
  connect: connectSocket,
  disconnect: disconnectSocket,
  isConnected,
  onBookingEvent,
  onConnect,
  onDisconnect,
  reconnect,
};
