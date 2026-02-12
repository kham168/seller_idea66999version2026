import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  createConversation,
  getConversationMessages,
  sendEmail,
} from "../controller/admin/a_chat.js";

const router = express.Router();

router.post("/conversations1", verifyJWT, createConversation);
router.get("/conversations/:id/messages", verifyJWT, getConversationMessages);
// router.post("/mail", sendWelcomeEmail);
router.post("/email", verifyJWT, sendEmail);

export default router;
