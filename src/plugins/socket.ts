import io from "socket.io-client";
import { useConfigStore } from "@/stores/config";

const configStore = useConfigStore();

// Selalu terhubung: reconnect tanpa batas, backoff 1–5 dtk; fallback polling
// bila websocket diblok proxy/firewall. Tab kembali aktif → paksa connect.
const socket = io(configStore.socketIoUrl, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !socket.connected) socket.connect();
  });
  window.addEventListener("online", () => { if (!socket.connected) socket.connect(); });
}

export default socket;