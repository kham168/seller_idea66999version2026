import express from "express";
// use Express built-in parser instead of external `body-parser`
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors"; // keep this
import { requestLimiter } from "./dbconfig/requestLimited.js";

// routes
import ad from "./router/a_router.js";
import web from "./router/w_router.js";
import sh from "./router/s_router.js";

import http from "http";
import { Server } from "socket.io";
import chat from "./router/chat.router.js";
import { dbExecution } from "./dbconfig/dbconfig.js";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Attach REST routes

// ✅ apply cors with your options
app.use(cors());
// app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "./channelImage")));
app.use(express.static(path.join(__dirname, "./productImage")));
app.use(express.static(path.join(__dirname, "./refillwalletimage")));
app.use("/", express.static(path.join(process.cwd(), "uploads")));

// built-in json parser
app.use(express.json());
app.use(cookieParser());
app.use(requestLimiter);
app.use("/api/a", ad);
app.use("/api/w", web);
app.use("/api/s", sh);
app.use("/api/chat", chat);
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

////////////=================Chat message========

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const newId = () => Math.random().toString(36).substring(2, 12);

// ✅ Auth middleware for socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));
    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const payload = jwt.verify(token, secret);
    socket.user = { id: payload.id, gmail: payload.gmail };
    // socket.user = { id: "test1", gmail: "test@gmail.com" };
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

// ✅ Manage sockets
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.user.id;
  console.log(`User ${userId} connected`, socket.id);

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // handle message sending
  socket.on("send_message", async (payload, ack) => {
    // console.log("==========================");
    // console.log(payload);
    try {
      const { conversationId, body, type = "text", attachments = [] } = payload;

      if (!conversationId || (!body && attachments.length === 0)) {
        return ack?.({ ok: false, message: "Invalid message payload" });
      }

      const messageId = `msg_${Date.now()}_${newId()}`;
      const senderId = userId;

      const insertQ = `
        INSERT INTO public.message (id, conversation_id, sender_id, body, attachments, type, status, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'sent', NOW())
        RETURNING *;
      `;
      const resDb = await dbExecution(insertQ, [
        messageId,
        conversationId,
        senderId,
        body,
        JSON.stringify(attachments),
        type,
      ]);
      const message = resDb?.rows?.[0];

      // get members of the conversation
      const membersQ = `SELECT memberid FROM public.conversation_member WHERE conversation_id=$1;`;
      const membersRes = await dbExecution(membersQ, [conversationId]);
      const memberIds = (membersRes.rows || []).map((r) => r.memberid);

      // send message to all online participants
      for (const mid of memberIds) {
        const sockets = onlineUsers.get(mid);
        if (sockets) {
          for (const sid of sockets)
            io.to(sid).emit("message_received", message);
        }
      }

      ack?.({ ok: true, message });
    } catch (err) {
      console.error("send_message error:", err);
      ack?.({ ok: false, message: "Failed to send" });
    }
  });

  // handle disconnect
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
    if (onlineUsers.has(userId)) {
      const set = onlineUsers.get(userId);
      set.delete(socket.id);
      if (set.size === 0) onlineUsers.delete(userId);
    }
  });
});

//////////===============End of chat message=======

// Normalize and validate port from env, fallback to 1789 when missing/invalid
const APPPORT = Number(process.env.APPPORT);
// app.listen(APPPORT, () => {
//   console.log(`App is running on port ${APPPORT}`);
// });
// Handle listen errors (e.g., port already in use) with a friendly message
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${APPPORT} is already in use. Either stop the process using that port or set a different port via the APPPORT environment variable.`,
    );
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});
server.listen(APPPORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${APPPORT}`);
});
