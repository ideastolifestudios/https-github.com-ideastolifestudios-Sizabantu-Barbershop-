import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const socketUrl = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SOCKET_URL) || (process.env as any).VITE_SOCKET_URL || "";

  if (!socketUrl) return null;

  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: true,
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 5000,
    });
  }
  return socket;
}
