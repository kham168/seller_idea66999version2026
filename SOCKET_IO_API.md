# Socket.IO Real-Time Chat API Documentation

## Overview

This document describes the complete Socket.IO chat API for real-time messaging, typing indicators, read receipts, and conversation management.

---

## 🔌 Connection & Authentication

### Connection Setup

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:YOUR_PORT", {
  auth: {
    token: "YOUR_JWT_TOKEN_HERE",
    // Token can be with or without "Bearer " prefix
  },
});
```

### Authentication Flow

1. Client sends JWT token in `socket.handshake.auth.token`
2. Server middleware verifies token using RS256 public key
3. Token is decrypted and validated before socket connection
4. User data (`id`, `gmail`) is attached to socket object

**Error Handling:**

```javascript
socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
});
```

---

## 📨 Message Events

### Send Message

**Event:** `send_message`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  body: "Hello, this is a message",         // Optional if attachments present
  type: "text",                             // Optional: 'text' | 'image' | 'file' (default: 'text')
  attachments: [                            // Optional array of file objects
    {
      id: "att_123",
      name: "photo.jpg",
      url: "https://...",
      type: "image/jpeg"
    }
  ]
}
```

**Response (via callback):**

```javascript
socket.emit("send_message", payload, (response) => {
  if (response.ok) {
    console.log("Message sent:", response.message);
    // message object includes: id, conversation_id, sender_id, body, attachments, type, status, created_at
  } else {
    console.error("Error:", response.message);
  }
});
```

**Broadcast Event:** `message_received`

```javascript
socket.on("message_received", (message) => {
  console.log("New message from", message.sender_id, ":", message.body);
  // message: { id, conversation_id, sender_id, body, attachments, type, status, created_at, senderEmail }
});
```

---

### Typing Indicator

**Event:** `typing`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  isTyping: true                            // Boolean
}
```

**Broadcast Event:** `user_typing`

```javascript
socket.on("user_typing", (data) => {
  console.log(
    `${data.userEmail} is ${data.isTyping ? "typing" : "stopped typing"}`,
  );
  // data: { conversationId, userId, userEmail, isTyping, timestamp }
});
```

**Best Practice:** Emit `typing` with `isTyping: true` when user starts typing, emit with `isTyping: false` when they stop (e.g., after 3 seconds of inactivity).

---

### Mark Messages as Read

**Event:** `mark_as_read`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  messageIds: [                             // Required array
    "msg_1234567890_abc1",
    "msg_1234567890_abc2"
  ]
}
```

**Broadcast Event:** `messages_read`

```javascript
socket.on("messages_read", (data) => {
  console.log(`User ${data.readBy} read ${data.messageIds.length} messages`);
  // data: { conversationId, messageIds[], readBy, readAt }
});
```

---

### Delete Message

**Event:** `delete_message`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  messageId: "msg_1234567890_abc1"         // Required
}
```

**Response (via callback):**

```javascript
socket.emit("delete_message", payload, (response) => {
  if (response.ok) {
    console.log("Message deleted");
  } else {
    console.error("Error:", response.message); // "Only message sender can delete"
  }
});
```

**Broadcast Event:** `message_deleted`

```javascript
socket.on("message_deleted", (data) => {
  console.log(`Message ${data.messageId} was deleted by ${data.deletedBy}`);
  // data: { conversationId, messageId, deletedBy, deletedAt }
});
```

**Note:** Deletion is soft—message body is replaced with "[Deleted]" and type changed to "deleted".

---

### Edit Message

**Event:** `edit_message`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  messageId: "msg_1234567890_abc1",        // Required
  newBody: "This is the edited message"    // Required
}
```

**Response (via callback):**

```javascript
socket.emit("edit_message", payload, (response) => {
  if (response.ok) {
    console.log("Message updated:", response.message);
  } else {
    console.error("Error:", response.message); // "Only message sender can edit"
  }
});
```

**Broadcast Event:** `message_edited`

```javascript
socket.on("message_edited", (updatedMessage) => {
  console.log(`Message edited by ${updatedMessage.editedBy}`);
  // updatedMessage: { id, body, type: 'edited', updated_at, editedBy, ... }
});
```

---

## 💬 Conversation Events

### Create Conversation

**Event:** `create_conversation`

**Payload:**

```javascript
{
  memberIds: ["user_123", "user_456"],     // Required array (others besides caller)
  conversationName: "Project Discussion",  // Optional
  isGroup: true                            // Optional, default: false (set true for group chats)
}
```

**Response (via callback):**

```javascript
socket.emit("create_conversation", payload, (response) => {
  if (response.ok) {
    console.log("Conversation created:", response.conversation);
  } else {
    console.error("Error:", response.message);
  }
});
```

**Broadcast Event:** `conversation_created`

```javascript
socket.on("conversation_created", (conversation) => {
  console.log("New conversation:", conversation.id);
  // conversation: { id, name, is_group, created_by, created_at, members[] }
});
```

---

### Load Conversation Members

**Event:** `load_members`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd"; // Required
}
```

**Response (via callback):**

```javascript
socket.emit("load_members", payload, (response) => {
  if (response.ok) {
    response.members.forEach((member) => {
      console.log(
        `${member.userId} is ${member.isOnline ? "online" : "offline"}`,
      );
    });
  }
});
```

**Returns:** Array of members with online status

```javascript
[
  { userId: "user_123", isOnline: true },
  { userId: "user_456", isOnline: false },
];
```

---

### Load Message History

**Event:** `load_messages`

**Payload:**

```javascript
{
  conversationId: "conv_1234567890_abcd",  // Required
  limit: 50,                               // Optional, default: 50
  offset: 0                                // Optional, default: 0 (for pagination)
}
```

**Response (via callback):**

```javascript
socket.emit("load_messages", payload, (response) => {
  if (response.ok) {
    console.log(`Loaded ${response.count} messages`);
    response.messages.forEach((msg) => {
      console.log(`[${msg.sender_id}]: ${msg.body}`);
    });
  }
});
```

**Returns:** Array of messages (oldest first) with metadata

```javascript
[
  {
    id: "msg_1234567890_abc1",
    conversation_id: "conv_...",
    sender_id: "user_123",
    body: "Hello",
    attachments: [],
    type: "text",
    status: "read",
    created_at: "2026-02-23T10:30:00Z"
  },
  ...
]
```

---

## 👥 User Presence Events

### User Online

**Broadcast Event:** `user_online`

Emitted to all connected clients when a user connects.

```javascript
socket.on("user_online", (data) => {
  console.log(`${data.userEmail} is now online`);
  // data: { userId, userEmail, timestamp }
});
```

---

### User Offline

**Broadcast Event:** `user_offline`

Emitted to all connected clients when a user's last socket disconnects.

```javascript
socket.on("user_offline", (data) => {
  console.log(`${data.userEmail} is now offline`);
  // data: { userId, userEmail, timestamp }
});
```

---

## ⚠️ Error Handling

### Connection Errors

```javascript
socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
  // Common: "Authentication error"
});
```

### Socket Errors

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
});
```

### Acknowledgment Errors

```javascript
socket.emit("send_message", payload, (response) => {
  if (!response.ok) {
    console.error("Event failed:", response.message);
    if (response.error) {
      console.error("Details:", response.error);
    }
  }
});
```

---

## 📝 Client Implementation Example

```javascript
import io from "socket.io-client";

class ChatClient {
  constructor(serverUrl, token) {
    this.socket = io(serverUrl, {
      auth: { token },
    });

    this.setupListeners();
  }

  setupListeners() {
    // Connection
    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection failed:", error.message);
    });

    // Messages
    this.socket.on("message_received", (message) => {
      console.log("New message:", message);
      this.onMessageReceived?.(message);
    });

    this.socket.on("user_typing", (data) => {
      this.onUserTyping?.(data);
    });

    this.socket.on("messages_read", (data) => {
      this.onMessagesRead?.(data);
    });

    this.socket.on("message_deleted", (data) => {
      this.onMessageDeleted?.(data);
    });

    this.socket.on("message_edited", (data) => {
      this.onMessageEdited?.(data);
    });

    // Presence
    this.socket.on("user_online", (data) => {
      this.onUserOnline?.(data);
    });

    this.socket.on("user_offline", (data) => {
      this.onUserOffline?.(data);
    });

    // Conversations
    this.socket.on("conversation_created", (conversation) => {
      this.onConversationCreated?.(conversation);
    });
  }

  // Message operations
  sendMessage(conversationId, body, attachments = []) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "send_message",
        { conversationId, body, attachments },
        (response) => {
          if (response.ok) resolve(response.message);
          else reject(new Error(response.message));
        },
      );
    });
  }

  notifyTyping(conversationId, isTyping) {
    this.socket.emit("typing", { conversationId, isTyping });
  }

  markAsRead(conversationId, messageIds) {
    this.socket.emit("mark_as_read", { conversationId, messageIds });
  }

  deleteMessage(conversationId, messageId) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "delete_message",
        { conversationId, messageId },
        (response) => {
          if (response.ok) resolve();
          else reject(new Error(response.message));
        },
      );
    });
  }

  editMessage(conversationId, messageId, newBody) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "edit_message",
        { conversationId, messageId, newBody },
        (response) => {
          if (response.ok) resolve(response.message);
          else reject(new Error(response.message));
        },
      );
    });
  }

  // Conversation operations
  createConversation(memberIds, conversationName, isGroup = false) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "create_conversation",
        { memberIds, conversationName, isGroup },
        (response) => {
          if (response.ok) resolve(response.conversation);
          else reject(new Error(response.message));
        },
      );
    });
  }

  loadMembers(conversationId) {
    return new Promise((resolve, reject) => {
      this.socket.emit("load_members", { conversationId }, (response) => {
        if (response.ok) resolve(response.members);
        else reject(new Error(response.message));
      });
    });
  }

  loadMessages(conversationId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "load_messages",
        { conversationId, limit, offset },
        (response) => {
          if (response.ok) resolve(response.messages);
          else reject(new Error(response.message));
        },
      );
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export default ChatClient;
```

---

## 🗄️ Database Schema Requirements

Ensure your database has these tables:

```sql
-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversation (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  is_group BOOLEAN DEFAULT false,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Conversation members table
CREATE TABLE IF NOT EXISTS public.conversation_member (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR REFERENCES public.conversation(id),
  memberid VARCHAR NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.message (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR REFERENCES public.conversation(id) ON DELETE CASCADE,
  sender_id VARCHAR NOT NULL,
  body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  type VARCHAR DEFAULT 'text',
  status VARCHAR DEFAULT 'sent', -- sent, delivered, read
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

---

## 🔒 Security Notes

1. **JWT Verification:** Token is verified using RS256 algorithm and public key
2. **Authorization:** Users can only edit/delete their own messages
3. **CORS:** Configure CORS origins in production (not `*`)
4. **Rate Limiting:** Consider adding rate limits for socket events
5. **Input Validation:** All payloads should be validated before processing
6. **Message Encryption:** Consider encrypting sensitive messages at rest

---

## 🚀 Performance Tips

1. **Pagination:** Use `limit` and `offset` for loading old messages
2. **Throttling:** Throttle `typing` events (emit every 300ms max)
3. **Read Receipts:** Batch read receipts instead of one per message
4. **Cleanup:** Regularly clean up disconnected socket references
5. **Indexing:** Index `conversation_id`, `sender_id` in messages table

---

## 📞 Support

For issues or feature requests related to the Socket.IO chat API, check:

- Server logs in terminal
- Browser console for client-side errors
- Network tab for Socket.IO connection status
