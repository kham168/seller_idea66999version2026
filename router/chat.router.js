import express from "express";
import {
  createConversation,
  getConversationMessages,sendEmail
} from "../controller/admin/a_chat.js";

const router = express.Router();

router.post("/conversations1", createConversation);
router.get("/conversations/:id/messages", getConversationMessages);
// router.post("/mail", sendWelcomeEmail);
router.post("/email", sendEmail);

export default router;
