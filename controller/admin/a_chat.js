import { dbExecution } from "../../dbconfig/dbconfig.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { log } from "console";
dotenv.config();

// helper to create unique IDs
const newId = () => Math.random().toString(36).substring(2, 12);

// ✅ Create new conversation
export const createConversation = async (req, res) => {
  const { memberA, memberB } = req.body;

  if (!memberA || !memberB) {
    return res.status(400).send({ ok: false, msg: "Both members required" });
  }

  try {
    const convId = `conv_${Date.now()}_${newId()}`;

    await dbExecution(
      `INSERT INTO public.conversation (id, is_group, meta)
       VALUES ($1, false, $2);`,
      [convId, JSON.stringify({})]
    );

    await dbExecution(
      `INSERT INTO public.conversation_member (id, conversation_id, memberid)
       VALUES ($1, $2, $3);`,
      [`cm_${newId()}`, convId, memberA]
    );

    await dbExecution(
      `INSERT INTO public.conversation_member (id, conversation_id, memberid)
       VALUES ($1, $2, $3);`,
      [`cm_${newId()}`, convId, memberB]
    );

    res.send({ ok: true, convId });
  } catch (err) {
    console.error("createConversation error:", err);
    res.status(500).send({ ok: false, msg: "Internal Server Error" });
  }
};

// ✅ Get messages (paginated)
export const getConversationMessages = async (req, res) => {
  const convId = req.params.id;
  const page = parseInt(req.query.page || "0", 10);
  const limit = parseInt(req.query.limit || "30", 10);
  const offset = page * limit;

  try {
    const q = `
      SELECT * FROM public.message
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const r = await dbExecution(q, [convId, limit, offset]);
    res.send({ ok: true, data: (r.rows || []).reverse() }); // oldest-first
  } catch (err) {
    console.error("getConversationMessages error:", err);
    res.status(500).send({ ok: false, msg: "Internal Server Error" });
  }
};

export const sendEmail = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    // 1️⃣ Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER, // your gmail
        pass: process.env.GMAIL_APP_PASS, // app password
      },
    });

    // 2️⃣ Mail options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to, // can be a string or array
      subject: subject || "No subject",
      text: text || "",
      html: html || "",
    };

    const info = await transporter.sendMail(mailOptions);

    res.status(200).send({
      status: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("❌ Email send error:", error);
    res.status(500).send({
      status: false,
      message: "Failed to send email",
    });
  }
};
export const getConv_id = async (req, res) => {
  try {
    const { memberA, memberB } = req.body;

    console.log("Members:", memberA, memberB);

    if (memberA == null || memberB == null) {
      return res.status(400).send({
        ok: false,
        msg: "Both members required"
      });
    }

    const q = `
      SELECT cm1.conversation_id,cm1.memberid AS menberA,cm2.memberid AS menberB
      FROM public.conversation_member cm1
      JOIN public.conversation_member cm2
        ON cm1.conversation_id = cm2.conversation_id
      WHERE cm1.memberid = $1
        AND cm2.memberid = $2;
    `;

    const r = await dbExecution(q, [memberA, memberB]);

    // console.log("Query result:", r.rows);

    if (r.rows.length > 0) {
      return res.send({
        ok: true,
        convId: r.rows[0].conversation_id
      });
    } else {
      return res.status(400).send({
        ok: false,
        msg: "No conversation found"
      });
    }

  } catch (err) {
    console.error("getConv_id error:", err);
    return res.status(500).send({
      ok: false,
      msg: "Internal Server Error"
    });
  }
};