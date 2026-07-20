import { io } from "socket.io-client";
/**
 * サーバーサイドのsocket.ioオブジェクト
 */
export const socket = io(import.meta.env.VITE_SIGNALING_URL || "http://localhost:4000");