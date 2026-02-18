import express from "express";
// use Express built-in parser instead of external body-parser
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
import fs from "fs";
import { decrypt } from "./middleware/crypto.js"; // ກວດສອບ Path ໃຫ້ຖືກ

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
// io.use(async (socket, next) => {
//   try {
//     const token = socket.handshake.auth?.token;
//     console.log("token", token);
//     if (!token) return next(new Error("Authentication error"));
//     const secret = process.env.JWT_SECRET || "your_jwt_secret";
//     const payload = jwt.verify(token, secret);
//     socket.user = { id: payload.id, gmail: payload.gmail };
//     // socket.user = { id: "test1", gmail: "test@gmail.com" };
//     next();
//   } catch (err) {
//     console.error("Socket auth error:", err.message);
//     next(new Error("Authentication error"));
//   }
// });
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    console.log("Incoming socket token:", token);

    if (!token) return next(new Error("Authentication error"));

    // 1. ຕັດຄຳວ່າ Bearer ອອກ (ຖ້າມີ)
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const PUBLIC_KEY = (() => {
      try {
        // __dirname ແມ່ນ path ຂອງ folder ທີ່ app.js ຢູ່
        // ດັ່ງນັ້ນເຮົາເຂົ້າໄປ folder 'key' ແລະ ໄຟລ໌ 'public.key' ໄດ້ໂດຍກົງ
        const keyPath = path.join(__dirname, "key", "public.key");
        
        console.log("📂 Attempting to load key from:", keyPath); // ໃສ່ໄວ້ເພື່ອ Debug
        
        return fs.readFileSync(keyPath, "utf8").trim();
      } catch (error) {
        console.error("❌ Failed to load public.key:", error.message);
        process.exit(1);
      }
    })();
    console.log('PUBLIC_KEY', PUBLIC_KEY);
    
    
    // 2. ເພີ່ມ Logic ກວດສອບ Fix Token ທີ່ເຈົ້າໃຊ້ Test
    // const myFixToken = "t7ILgVDngea0cjEqNtu8Yg==:6shy3q2jsnDBOit8VBSz+eS90w6ULYPp3YPEeVkrAhPEd+W3WsBTRj8jWUh1neIDcef2PGoMa7OuxxuucFQJW5w0tB96o4NSF4PB5oW3+JtvowxYkuO3pbZjvzraj16/BY/EYEye7plUX493HOCk8w/KCsicywiZeunkhzFdhxVBIF2Jd/gbuvBAMkX3Zwy0JcQcHz3sgOPlNo3ZkPa8qoe8i0TTgE0UPQRO/5uQeRbhfje07ah8gKJDCnlSiT+OBScAhEMuMd0AZu2eu6/Od51S9qjWwQqMKsK5QniNjoe871+rXaspbmve01281U1+DDxotvUiIHTYcVdCFKqsTg0t6Brxc4R4AgN3oGH8taEK32XP9nVfFSXSe0TDDrevltQ71LIXEEe7vc1hnd8KSLYcC0P+FlmL1IapJA7RpRBUc85A3UaeFsUElwZS94VTCqH2h8AAACc5YIxJJn+Ujlwo62ajo0DnmcQaYCvBNdxOQC0Y/+kl8vmZgdGCMYx8xv1QpKdF0ZXJUisIeD3QXsNOmm0BTgGTgkw+4/G4IpTOvxqHMGEqqFwiMVU/RRfcrzH+UCJVwuOMcp+ByTeULgfYKZOejExDVZrF/dpkIbJekYbf944Ho4c37W9Bz1Uu";

    // if (token === myFixToken) {
    //   console.log("✅ Fix Token bypass activated");
    //   socket.user = { id: "2", gmail: "test@gmail.com" }; // ຕັ້ງຄ່າ User ຕາມທີ່ຕ້ອງການ Test
    //   return next();
    // }
    // 2. ຖອດລະຫັດ Token (Decrypt) - ຕ້ອງເຮັດຄືກັບໃນ verifyJWT middleware
    let jwtToken;
    try {
      jwtToken = decrypt(token);
    } catch (err) {
      console.error("❌ Token decryption failed for socket:", err.message);
      return next(new Error("Authentication error"));
    }

    // 3. ຖ້າບໍ່ແມ່ນ Fix Token ໃຫ້ Verify ຕາມປົກກະຕິ (JWT)
    try {
      const payload = jwt.verify(jwtToken, PUBLIC_KEY, {
        algorithms: ["RS256"],
      });
      socket.user = { id: payload.id, gmail: payload.gmail };
      next();
    } catch (jwtErr) {
      console.error("JWT verify error:", jwtErr.message);
      // ຖ້າ JWT ຜິດພາດ ຫຼື Expired ກໍໃຫ້ Error
      return next(new Error("Authentication error"));
    }

  } catch (err) {
    console.error("Socket auth general error:", err.message);
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
//   console.log(App is running on port ${APPPORT});
// });
// Handle listen errors (e.g., port already in use) with a friendly message
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`
      ❌ Port ${APPPORT} is already in use. Either stop the process using that port or set a different port via the APPPORT environment variable.`,
    );
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});
server.listen(APPPORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${APPPORT}`);
});