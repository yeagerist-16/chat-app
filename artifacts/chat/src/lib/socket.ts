import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const base = window.location.origin;
  socket = io(base, {
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}
