import express from "express";
import { fileURLToPath } from "url";
import cors from "cors"; // keep this

import http from "http";
import { Server } from "socket.io";


const app = express();
app.use(cors());
app.use(express.json());

// ✅ Attach REST routes

// ✅ apply cors with your options
app.use(cors());


// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


// ✅ Auth middleware for socket.io
io.use(async (socket, next) => {
  try {
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});


io.on("connection", (socket) => {
  console.log("hello world")
});


const APPPORT = Number(process.env.APPPORT) || 1789;
app.listen(APPPORT, () => {
  console.log(`App is running on port ${APPPORT}`);
});
