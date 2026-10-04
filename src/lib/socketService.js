import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { resolveWsEndpoint } from "../config/apiBase";

const WS_ENDPOINT = resolveWsEndpoint();

let stompClient = null;
let subscriptions = {};
let pendingConnects = [];

const eventListeners = {
  onBookingEvent: [],
  onConnect: [],
  onDisconnect: [],
};

export const connectSocket = () => {
  if (stompClient?.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    pendingConnects.push(resolve);
    if (stompClient?.active) return;

    // stompjs gọi webSocketFactory mỗi lần reconnect nên phải tạo SockJS mới,
    // tái sử dụng socket đã đóng sẽ khiến client treo ở trạng thái connecting.
    stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log("[WS]", str);
        }
      },
      reconnectDelay: 2000,
      connectionTimeout: 10000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        console.log("[WS] Connected");
        // Subscription của kết nối trước đã chết theo socket cũ
        subscriptions = {};
        subscribeToBookings();
        eventListeners.onConnect.forEach((cb) => cb());
        pendingConnects.forEach((done) => done());
        pendingConnects = [];
      },

      onStompError: (frame) => {
        console.error("[WS] STOMP Error:", frame);
      },

      onWebSocketClose: () => {
        eventListeners.onDisconnect.forEach((cb) => cb());
      },

      onWebSocketError: (error) => {
        console.error("[WS] Error:", error);
      },
    });

    stompClient.activate();
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
