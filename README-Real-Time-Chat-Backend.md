# Real-Time Chat Backend

A production-style backend for a real-time chat application, designed to work with a Vue 3 frontend.

The backend provides authentication, users, direct conversations, channels, messages, reactions, read receipts, typing indicators, online presence, cursor-based pagination, and real-time WebSocket events.

---

## Project Status

**Status:** In Development

This backend is intended to replace the mock REST API and mock WebSocket layer used by the frontend application.

---

## Technology Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Passport
- Socket.IO
- class-validator
- bcrypt
- Docker
- Docker Compose

---

## Main Features

### Authentication

- User registration
- User login
- JWT access tokens
- Password hashing with bcrypt
- Protected API routes

---

### Users

- Get current authenticated user
- List users
- User profile information
- Avatar field support

---

### Conversations

The backend supports two conversation types:

```text
DIRECT
CHANNEL
```

Features:

- Create direct conversations
- Create channels
- List conversations for the authenticated user
- Add conversation members during creation
- Private channel support
- Conversation roles

Available member roles:

```text
OWNER
ADMIN
MEMBER
```

---

### Messages

Users can:

- Send messages
- Edit their own messages
- Delete their own messages
- Reply to messages
- Load messages using cursor pagination
- React to messages
- Mark messages as read

---

### Real-Time Messaging

Socket.IO is used for real-time communication.

Supported server events:

```text
message.created
message.updated
message.deleted
message.read

reaction.created

typing.started
typing.stopped

user.online
user.offline
```

Supported client events:

```text
typing.start
typing.stop
```

---

### Online Presence

The WebSocket gateway tracks active socket connections per user.

This allows the frontend to receive:

```text
user.online
user.offline
```

Presence is based on active socket connections.

---

### Typing Indicators

Clients can emit:

```text
typing.start
typing.stop
```

Example payload:

```json
{
  "conversationId": "conversation-id"
}
```

Other members of the conversation receive:

```text
typing.started
typing.stopped
```

---

### Read Receipts

Users can mark messages as read.

The read state is stored in the database using a unique relationship between:

```text
messageId
userId
```

The backend also broadcasts:

```text
message.read
```

---

### Message Reactions

Users can react to messages using emojis.

A user cannot create the same reaction more than once for the same message.

Example:

```text
Message
|
+-- Like
+-- Love
+-- Celebrate
```

---

## Architecture

```text
Vue Frontend
     |
     +----------------------+
     |                      |
     v                      v
REST API                Socket.IO
     |                      |
     v                      v
NestJS Controllers     Chat Gateway
     |                      |
     v                      |
Services <------------------+
     |
     v
Prisma ORM
     |
     v
PostgreSQL
```

---

## Suggested Project Structure

```text
src/
|
+-- auth/
|   +-- dto/
|   +-- auth.controller.ts
|   +-- auth.service.ts
|   +-- auth.module.ts
|   +-- jwt.strategy.ts
|   +-- jwt-auth.guard.ts
|
+-- common/
|   +-- current-user.decorator.ts
|
+-- conversations/
|   +-- dto/
|   +-- conversations.controller.ts
|   +-- conversations.service.ts
|   +-- conversations.module.ts
|
+-- messages/
|   +-- dto/
|   +-- messages.controller.ts
|   +-- messages.service.ts
|   +-- messages.module.ts
|
+-- prisma/
|   +-- prisma.module.ts
|   +-- prisma.service.ts
|
+-- realtime/
|   +-- chat.gateway.ts
|   +-- realtime.module.ts
|
+-- users/
|   +-- users.controller.ts
|   +-- users.module.ts
|
+-- app.module.ts
+-- main.ts
```

---

## Database Models

The Prisma schema contains the following main models:

```text
User
Conversation
ConversationMember
Message
MessageReaction
MessageRead
```

Relationships:

```text
User
 |
 +-- ConversationMember
 |
 +-- Message
 |
 +-- MessageReaction
 |
 +-- MessageRead


Conversation
 |
 +-- ConversationMember
 |
 +-- Message


Message
 |
 +-- Sender
 |
 +-- Reply
 |
 +-- Replies
 |
 +-- Reactions
 |
 +-- Read Receipts
```

---

## API Endpoints

### Authentication

#### Register

```http
POST /api/auth/register
```

Example request:

```json
{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

Example response:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Ahmed",
    "email": "ahmed@example.com",
    "avatarUrl": null
  }
}
```

---

#### Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

---

## Users API

### Current User

```http
GET /api/users/me
```

Header:

```http
Authorization: Bearer <token>
```

---

### List Users

```http
GET /api/users
```

---

## Conversations API

### List Conversations

```http
GET /api/conversations
```

Returns conversations where the authenticated user is a member.

---

### Create Conversation

```http
POST /api/conversations
```

Direct conversation example:

```json
{
  "type": "DIRECT",
  "memberIds": [
    "user-id"
  ]
}
```

Channel example:

```json
{
  "type": "CHANNEL",
  "name": "frontend",
  "description": "Frontend development channel",
  "isPrivate": false,
  "memberIds": [
    "user-id-1",
    "user-id-2"
  ]
}
```

---

## Messages API

### List Messages

```http
GET /api/conversations/:conversationId/messages
```

Query parameters:

```text
cursor
limit
```

Example:

```http
GET /api/conversations/123/messages?limit=30&cursor=message-id
```

Response:

```json
{
  "items": [],
  "nextCursor": "next-message-id"
}
```

This endpoint is designed for TanStack Query `useInfiniteQuery()`.

---

### Send Message

```http
POST /api/conversations/:conversationId/messages
```

Request:

```json
{
  "content": "Hello!"
}
```

Reply example:

```json
{
  "content": "I agree.",
  "replyToId": "message-id"
}
```

After creation, the backend broadcasts:

```text
message.created
```

---

### Edit Message

```http
PATCH /api/messages/:messageId
```

Request:

```json
{
  "content": "Updated message"
}
```

Only the sender can edit the message.

Real-time event:

```text
message.updated
```

---

### Delete Message

```http
DELETE /api/messages/:messageId
```

Messages use soft deletion through:

```text
deletedAt
```

Only the sender can delete the message.

Real-time event:

```text
message.deleted
```

---

### Add Reaction

```http
POST /api/messages/:messageId/reactions
```

Request:

```json
{
  "emoji": "LIKE"
}
```

Real-time event:

```text
reaction.created
```

---

### Mark Message as Read

```http
POST /api/messages/:messageId/read
```

Real-time event:

```text
message.read
```

---

## WebSocket Authentication

Socket.IO clients must send the JWT access token.

Example:

```ts
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken,
  },
})
```

The server verifies the token before accepting the connection.

---

## Conversation Rooms

When a user connects, the backend automatically joins the socket to:

```text
user:<userId>
```

and all authorized conversation rooms:

```text
conversation:<conversationId>
```

This allows message events to be broadcast only to relevant conversation members.

---

## WebSocket Example

Listen for messages:

```ts
socket.on('message.created', (message) => {
  console.log(message)
})
```

Listen for typing:

```ts
socket.on('typing.started', (event) => {
  console.log(event)
})
```

Send typing event:

```ts
socket.emit('typing.start', {
  conversationId: 'conversation-id',
})
```

Stop typing:

```ts
socket.emit('typing.stop', {
  conversationId: 'conversation-id',
})
```

---

## Environment Variables

Create:

```text
.env
```

Example:

```env
PORT=3000

DATABASE_URL="postgresql://chat:chat@localhost:5432/chat?schema=public"

JWT_SECRET="change-this-secret"

JWT_EXPIRES_IN="7d"

FRONTEND_URL="http://localhost:5173"
```

Never commit real production secrets.

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the backend directory:

```bash
cd real-time-chat-backend
```

Install dependencies:

```bash
npm install
```

---

## PostgreSQL With Docker

Start PostgreSQL:

```bash
docker compose up -d postgres
```

The default development database configuration is:

```text
Host: localhost
Port: 5432
Database: chat
Username: chat
Password: chat
```

---

## Prisma Setup

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create the first migration:

```bash
npm run prisma:migrate -- --name init
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

---

## Seed Data

Run:

```bash
npm run seed
```

Example development users:

```text
ahmed@example.com
Password123!

sara@example.com
Password123!
```

These credentials are intended for local development only.

---

## Run Development Server

```bash
npm run start:dev
```

Backend URL:

```text
http://localhost:3000
```

REST API:

```text
http://localhost:3000/api
```

---

## Production Build

Build:

```bash
npm run build
```

Start:

```bash
npm run start:prod
```

---

## Run With Docker

Create `.env` first.

Then:

```bash
docker compose up --build
```

Services:

```text
Backend
PostgreSQL
```

---

## Connect the Vue Frontend

Update the frontend environment configuration:

```env
VITE_API_BASE_URL=http://localhost:3000/api

VITE_ENABLE_MOCKS=false

VITE_WS_URL=http://localhost:3000
```

The mock REST API and mock WebSocket implementation should be disabled when using this backend.

---

## Frontend Integration Flow

```text
Vue Component
      |
      v
TanStack Query
      |
      v
Axios
      |
      v
NestJS API
      |
      v
Prisma
      |
      v
PostgreSQL
```

Real-time:

```text
NestJS Service
      |
      v
Socket.IO Gateway
      |
      v
Vue WebSocket Client
      |
      v
TanStack Query Cache
      |
      v
UI Update
```

---

## Security Considerations

Current security practices include:

- Password hashing
- JWT authentication
- Protected endpoints
- DTO validation
- Database-level relations
- Conversation membership checks
- Message ownership checks
- WebSocket JWT validation
- CORS configuration

Before production deployment, also add:

- Refresh tokens
- Rate limiting
- Brute-force protection
- Secure cookie strategy if applicable
- Helmet
- Strong secrets
- Secret management
- Audit logs
- File validation
- Malware scanning for uploaded files

---

## Scalability

The current Socket.IO implementation is suitable for a single backend instance.

For horizontal scaling, use:

```text
Load Balancer
      |
      +----------------+
      |                |
      v                v
Backend 1          Backend 2
      |                |
      +-------+--------+
              |
              v
          Redis Adapter
              |
              v
         PostgreSQL
```

Recommended additions:

- Redis Socket.IO adapter
- Redis presence store
- Redis caching
- Background queues
- Object storage for files

---

## Recommended Next Features

### High Priority

- Refresh token authentication
- Remove reaction endpoint
- Channel member management
- Message search
- Notifications module
- File uploads
- Swagger / OpenAPI
- Rate limiting
- Jest integration tests
- E2E tests

### Scaling

- Redis
- Socket.IO Redis adapter
- Queue workers
- BullMQ
- Centralized presence

### File Attachments

Recommended architecture:

```text
Frontend
   |
   v
Backend
   |
   v
S3 / MinIO
```

Store only attachment metadata in PostgreSQL.

---

## Future API Modules

Possible future modules:

```text
auth
users
conversations
channels
messages
reactions
notifications
attachments
search
presence
admin
```

---

## Testing Strategy

Recommended test layers:

### Unit Tests

Test:

```text
AuthService
ConversationsService
MessagesService
JWT guards
Validation
Permission rules
```

### Integration Tests

Test:

```text
Prisma queries
Conversation permissions
Message pagination
Reactions
Read receipts
```

### E2E Tests

Test complete flows:

```text
Register
  |
  v
Login
  |
  v
Create Conversation
  |
  v
Send Message
  |
  v
Receive WebSocket Event
  |
  v
React
  |
  v
Mark Read
```

---

## Portfolio Skills Demonstrated

This backend is intended to demonstrate:

```text
Node.js
NestJS
TypeScript
REST API Design
PostgreSQL
Prisma ORM
JWT Authentication
Authorization
WebSockets
Socket.IO
Real-Time Systems
Cursor Pagination
Database Relationships
Validation
Docker
Clean Architecture
Scalable Backend Design
```

---

## License

No license has been selected yet.

Add a `LICENSE` file before declaring a specific open-source license.

---

## Related Frontend

This backend is designed to integrate with the Vue 3 Real-Time Chat frontend.

Frontend stack:

```text
Vue 3
TypeScript
Vite
Pinia
Vue Router
Tailwind CSS
Axios
TanStack Query
Zod
Vitest
Playwright
Storybook
Docker
```
