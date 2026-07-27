// src/server.ts
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

/* ---------- 設定（環境変数から。無ければデフォルト） ---------- */
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN =
  process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) ?? "*";
/* ---------- 型 ---------- */
type Role = "display" | "controller";
type JoinPayload = { roomId: string; role: Role };
type SignalPayload = {
  to: string;
  description?: { type: "offer" | "answer"; sdp?: string };//SDPがはいる接続に必要な情報
  candidate?: Record<string, unknown>;  //ICE候補
};

/* ---------- ルームごとのDisplayを記録（roomId -> displayの socket.id） ---------- */
const roomDisplays = new Map<string, string>();

/* ---------- Express（HTTP側。healthzだけ返す） ---------- */
const app = express();
app.get("/healthz", (_req, res) => res.send("ok"));

/* ---------- HTTPサーバー + Socket.IO ---------- */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});


/**
 * 接続のコネクション
 * Display = PC側
 * Controller ＝スマホ側
 * roomID = 部屋の住所
 * displayID ＝displayの住所
 * 一ルームにつきに１ディスプレイがいる想定
 * join＝部屋に入手つ
 * emit = 部屋にいるデバイスに伝達を行う
 */

io.on("connection", (socket: Socket) => {
  console.log(`[connect]    ${socket.id}`);

  /* ---- 部屋に入る ---- */
  socket.on("join", ({ roomId, role }: JoinPayload) => {
    // 不正なペイロードは弾く
    if (!roomId || (role !== "display" && role !== "controller")) {
      socket.emit("join-error", { reason: "invalid join payload" });
      return;
    }
    // --- Display として参加 ---
    if (role === "display") {
      if (roomDisplays.has(roomId)) {
        socket.emit("join-error", { reason: "display already exists" });
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = "display";
      roomDisplays.set(roomId, socket.id);
      socket.emit("display-joined", { roomId });
      console.log(`[display]    ${socket.id} -> ${roomId}`);
      return;
    }

    // --- Controller として参加 ---
    /**
     * roomDisplaysから、roomIdに該当するディスプレイをひっぱてコントローラーにもディスプレイもに書くブラウザが到達したことを通達する。
     */

    const displayId = roomDisplays.get(roomId);
    
    if (!displayId) {
     // socket.emit("no-display", { roomId }); // Displayがまだ居ない
      return;
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = "controller";
    socket.emit("joined", { roomId, displayId });            // 接続先Displayを教える
    io.to(displayId).emit("peer-joined", { peerId: socket.id }); // Displayにだけ通知
    console.log(`[controller] ${socket.id} -> ${roomId} (display: ${displayId})`);
  });


  /* ---- シグナリング中継（offer/answer/ICEを相手指定で転送。中身は見ない） ---- */
  socket.on("signal", ({ to, description, candidate }: SignalPayload) => {
    if (!to) return;
    io.to(to).emit("signal", { from: socket.id, description, candidate });
  });

  /* ---- 切断（役割で通知先を変える） ---- */
  socket.on("disconnecting", () => {
    const roomId: string | undefined = socket.data.roomId;
    const role: Role | undefined = socket.data.role;
    if (!roomId) return;
    if (role === "display") {
      socket.to(roomId).emit("left", { peerId: socket.id, role: "display" }); // 全コントローラへ→ルーム終了
      roomDisplays.delete(roomId);
    } else {//peerに対して切断ー終了のシグナル
      const displayId = roomDisplays.get(roomId);
      if (displayId) io.to(displayId).emit("left", { peerId: socket.id, role: "controller" });
    }
  });

  socket.on("disconnect", (reason) => console.log(`[disconnect] ${socket.id} (${reason})`));
});

/* ---------- 起動 ---------- */
httpServer.listen(PORT, () => {
  console.log(`Signaling server on :${PORT}`);
});