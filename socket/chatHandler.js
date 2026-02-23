import { dbExecution } from "../dbconfig/dbconfig.js";

const newId = () => Math.random().toString(36).substring(2, 12);

/**
 * Initialize Socket.IO chat handlers with real-time features
 * @param {Server} io - Socket.IO server instance
 * @param {Map} onlineUsers - Map to track online users and their sockets
 */
export const initializeChatHandlers = (io, onlineUsers) => {
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    const userEmail = socket.user.gmail;

    console.log(
      `[SOCKET CONNECTED] User ${userId} (${userEmail}) - Socket ID: ${socket.id}`,
    );

    // Track user online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Notify all users that this user is online
    io.emit("user_online", {
      userId,
      userEmail,
      timestamp: new Date().toISOString(),
    });

    // ========== MESSAGE EVENTS ==========

    /**
     * 📤 SEND MESSAGE - Send a message to a conversation
     * Expected payload: { conversationId, body?, type?, attachments? }
     */
    socket.on("send_message", async (payload, ack) => {
      try {
        const {
          conversationId,
          body = "",
          type = "text",
          attachments = [],
        } = payload;

        if (!conversationId) {
          return ack?.({ ok: false, message: "Conversation ID is required" });
        }

        if (!body && attachments.length === 0) {
          return ack?.({
            ok: false,
            message: "Message body or attachments required",
          });
        }

        // Create unique message ID
        const messageId = `msg_${Date.now()}_${newId()}`;

        // Insert message into database
        const insertQ = `
          INSERT INTO public.message 
          (id, conversation_id, sender_id, body, attachments, type, status, created_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'sent', NOW())
          RETURNING *;
        `;

        const result = await dbExecution(insertQ, [
          messageId,
          conversationId,
          userId,
          body,
          JSON.stringify(attachments),
          type,
        ]);

        const message = result?.rows?.[0];

        if (!message) {
          return ack?.({ ok: false, message: "Failed to create message" });
        }

        // Get all members of the conversation
        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1;
        `;
        const membersResult = await dbExecution(membersQ, [conversationId]);
        const memberIds = (membersResult?.rows || []).map((r) => r.memberid);

        // Emit message to all online members
        for (const memberId of memberIds) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("message_received", {
                ...message,
                senderEmail: userEmail,
              });
            }
          }
        }

        // Acknowledge the sender
        ack?.({
          ok: true,
          message: {
            ...message,
            senderEmail: userEmail,
          },
        });

        console.log(
          `[MESSAGE SENT] User ${userId} -> Conversation ${conversationId}`,
        );
      } catch (err) {
        console.error(`[ERROR] send_message:`, err.message);
        ack?.({
          ok: false,
          message: "Failed to send message",
          error: err.message,
        });
      }
    });

    /**
     * 📝 TYPING INDICATOR - Notify others when typing
     * Expected payload: { conversationId, isTyping }
     */
    socket.on("typing", async (payload) => {
      try {
        const { conversationId, isTyping } = payload;

        if (!conversationId) return;

        // Get conversation members
        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1 AND memberid != $2;
        `;
        const result = await dbExecution(membersQ, [conversationId, userId]);
        const memberIds = (result?.rows || []).map((r) => r.memberid);

        // Emit typing status to other members
        for (const memberId of memberIds) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("user_typing", {
                conversationId,
                userId,
                userEmail,
                isTyping,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      } catch (err) {
        console.error(`[ERROR] typing:`, err.message);
      }
    });

    /**
     * ✅ READ RECEIPT - Mark messages as read
     * Expected payload: { conversationId, messageIds[] }
     */
    socket.on("mark_as_read", async (payload) => {
      try {
        const { conversationId, messageIds = [] } = payload;

        if (!conversationId || messageIds.length === 0) return;

        // Update message status in database
        const updateQ = `
          UPDATE public.message 
          SET status = 'read' 
          WHERE id = ANY($1::text[]) AND conversation_id = $2;
        `;

        await dbExecution(updateQ, [messageIds, conversationId]);

        // Get conversation members
        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1;
        `;
        const result = await dbExecution(membersQ, [conversationId]);
        const memberIds = (result?.rows || []).map((r) => r.memberid);

        // Emit read receipt to all members
        for (const memberId of memberIds) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("messages_read", {
                conversationId,
                messageIds,
                readBy: userId,
                readAt: new Date().toISOString(),
              });
            }
          }
        }

        console.log(
          `[READ RECEIPT] User ${userId} read ${messageIds.length} messages`,
        );
      } catch (err) {
        console.error(`[ERROR] mark_as_read:`, err.message);
      }
    });

    /**
     * 🗑️ DELETE MESSAGE - Soft delete a message
     * Expected payload: { conversationId, messageId }
     */
    socket.on("delete_message", async (payload, ack) => {
      try {
        const { conversationId, messageId } = payload;

        if (!conversationId || !messageId) {
          return ack?.({
            ok: false,
            message: "Conversation ID and Message ID required",
          });
        }

        // Verify ownership - only sender can delete
        const checkQ = `
          SELECT sender_id FROM public.message 
          WHERE id = $1 AND conversation_id = $2;
        `;
        const checkResult = await dbExecution(checkQ, [
          messageId,
          conversationId,
        ]);
        const message = checkResult?.rows?.[0];

        if (!message) {
          return ack?.({ ok: false, message: "Message not found" });
        }

        if (message.sender_id !== userId) {
          return ack?.({
            ok: false,
            message: "Only message sender can delete",
          });
        }

        // Soft delete
        const deleteQ = `
          UPDATE public.message 
          SET body = '[Deleted]', type = 'deleted', attachments = '[]'::jsonb 
          WHERE id = $1;
        `;

        await dbExecution(deleteQ, [messageId]);

        // Get conversation members
        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1;
        `;
        const result = await dbExecution(membersQ, [conversationId]);
        const memberIds = (result?.rows || []).map((r) => r.memberid);

        // Notify all members
        for (const memberId of memberIds) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("message_deleted", {
                conversationId,
                messageId,
                deletedBy: userId,
                deletedAt: new Date().toISOString(),
              });
            }
          }
        }

        ack?.({ ok: true, message: "Message deleted" });
        console.log(`[MESSAGE DELETED] ${messageId} by User ${userId}`);
      } catch (err) {
        console.error(`[ERROR] delete_message:`, err.message);
        ack?.({ ok: false, message: "Failed to delete message" });
      }
    });

    /**
     * ✏️ EDIT MESSAGE - Edit an existing message
     * Expected payload: { conversationId, messageId, newBody }
     */
    socket.on("edit_message", async (payload, ack) => {
      try {
        const { conversationId, messageId, newBody } = payload;

        if (!conversationId || !messageId || !newBody) {
          return ack?.({
            ok: false,
            message: "Conversation ID, Message ID, and new body required",
          });
        }

        // Verify ownership
        const checkQ = `
          SELECT sender_id FROM public.message 
          WHERE id = $1 AND conversation_id = $2;
        `;
        const checkResult = await dbExecution(checkQ, [
          messageId,
          conversationId,
        ]);
        const message = checkResult?.rows?.[0];

        if (!message) {
          return ack?.({ ok: false, message: "Message not found" });
        }

        if (message.sender_id !== userId) {
          return ack?.({
            ok: false,
            message: "Only message sender can edit",
          });
        }

        // Update message
        const updateQ = `
          UPDATE public.message 
          SET body = $1, type = 'edited', updated_at = NOW() 
          WHERE id = $2 
          RETURNING *;
        `;

        const result = await dbExecution(updateQ, [newBody, messageId]);
        const updatedMessage = result?.rows?.[0];

        // Get conversation members
        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1;
        `;
        const membersResult = await dbExecution(membersQ, [conversationId]);
        const memberIds = (membersResult?.rows || []).map((r) => r.memberid);

        // Notify all members
        for (const memberId of memberIds) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("message_edited", {
                ...updatedMessage,
                editedBy: userId,
              });
            }
          }
        }

        ack?.({ ok: true, message: updatedMessage });
        console.log(`[MESSAGE EDITED] ${messageId} by User ${userId}`);
      } catch (err) {
        console.error(`[ERROR] edit_message:`, err.message);
        ack?.({ ok: false, message: "Failed to edit message" });
      }
    });

    // ========== CONVERSATION EVENTS ==========

    /**
     * 💬 CREATE CONVERSATION - Create a new conversation
     * Expected payload: { memberIds[], conversationName?, isGroup? }
     */
    socket.on("create_conversation", async (payload, ack) => {
      try {
        const { memberIds = [], conversationName, isGroup = false } = payload;

        if (!memberIds || memberIds.length === 0) {
          return ack?.({ ok: false, message: "Members are required" });
        }

        // Always include current user
        const allMembers = [...new Set([userId, ...memberIds])];

        // Create conversation
        const convId = `conv_${Date.now()}_${newId()}`;
        const createConvQ = `
          INSERT INTO public.conversation 
          (id, name, is_group, created_by, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *;
        `;

        const convResult = await dbExecution(createConvQ, [
          convId,
          conversationName || `Conversation ${Date.now()}`,
          isGroup,
          userId,
        ]);

        const conversation = convResult?.rows?.[0];

        // Add members to conversation
        const memberInsertQ = `
          INSERT INTO public.conversation_member (conversation_id, memberid)
          VALUES ${allMembers.map((_, i) => `($1, $${i + 2})`).join(",")}
        `;

        await dbExecution(memberInsertQ, [convId, ...allMembers]);

        // Notify all members
        for (const memberId of allMembers) {
          const memberSockets = onlineUsers.get(memberId);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit("conversation_created", {
                ...conversation,
                members: allMembers,
              });
            }
          }
        }

        ack?.({
          ok: true,
          conversation: {
            ...conversation,
            members: allMembers,
          },
        });

        console.log(`[CONVERSATION CREATED] ${convId} by User ${userId}`);
      } catch (err) {
        console.error(`[ERROR] create_conversation:`, err.message);
        ack?.({ ok: false, message: "Failed to create conversation" });
      }
    });

    /**
     * 👥 LOAD CONVERSATION MEMBERS - Get list of members
     * Expected payload: { conversationId }
     */
    socket.on("load_members", async (payload, ack) => {
      try {
        const { conversationId } = payload;

        if (!conversationId) {
          return ack?.({ ok: false, message: "Conversation ID required" });
        }

        const membersQ = `
          SELECT memberid FROM public.conversation_member 
          WHERE conversation_id = $1;
        `;

        const result = await dbExecution(membersQ, [conversationId]);
        const memberIds = (result?.rows || []).map((r) => r.memberid);

        // Get online status for each member
        const memberStatus = memberIds.map((mid) => ({
          userId: mid,
          isOnline: onlineUsers.has(mid) && onlineUsers.get(mid).size > 0,
        }));

        ack?.({
          ok: true,
          members: memberStatus,
        });
      } catch (err) {
        console.error(`[ERROR] load_members:`, err.message);
        ack?.({ ok: false, message: "Failed to load members" });
      }
    });

    /**
     * 💬 LOAD MESSAGE HISTORY - Get past messages
     * Expected payload: { conversationId, limit?, offset? }
     */
    socket.on("load_messages", async (payload, ack) => {
      try {
        const { conversationId, limit = 50, offset = 0 } = payload;

        if (!conversationId) {
          return ack?.({ ok: false, message: "Conversation ID required" });
        }

        const messagesQ = `
          SELECT * FROM public.message 
          WHERE conversation_id = $1 
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3;
        `;

        const result = await dbExecution(messagesQ, [
          conversationId,
          limit,
          offset,
        ]);
        const messages = (result?.rows || []).reverse(); // Oldest first

        ack?.({
          ok: true,
          messages,
          count: messages.length,
        });
      } catch (err) {
        console.error(`[ERROR] load_messages:`, err.message);
        ack?.({ ok: false, message: "Failed to load messages" });
      }
    });

    // ========== DISCONNECT EVENT ==========

    /**
     * 🔌 USER DISCONNECT - Clean up when user disconnects
     */
    socket.on("disconnect", () => {
      console.log(
        `[SOCKET DISCONNECTED] User ${userId} (${userEmail}) - Socket ID: ${socket.id}`,
      );

      if (onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        sockets.delete(socket.id);

        // Only notify offline if user has no more active sockets
        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          io.emit("user_offline", {
            userId,
            userEmail,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    // ========== ERROR HANDLING ==========

    socket.on("connect_error", (error) => {
      console.error(`[CONNECT ERROR] User ${userId}:`, error.message);
    });

    socket.on("error", (error) => {
      console.error(`[SOCKET ERROR] User ${userId}:`, error);
    });
  });
};

export default initializeChatHandlers;
