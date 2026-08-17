# Real-Time Chat Backend

A scalable and production-ready backend for a **Real-Time Chat Application**, built with **Node.js, Express.js, Socket.IO, Redis, and PostgreSQL**.

The project provides real-time messaging, secure authentication, online presence tracking, conversation management, and scalable WebSocket communication.

## Key Features

* Real-time messaging with Socket.IO
* RESTful API architecture
* JWT authentication
* Private and group conversations
* Online/offline user presence
* Typing indicators
* Message delivery and read status
* Redis caching and Pub/Sub
* PostgreSQL database
* Rate limiting
* Input validation
* Centralized error handling
* Docker support
* Health check endpoints
* Scalable backend architecture

## Tech Stack

* **Node.js**
* **Express.js**
* **Socket.IO**
* **PostgreSQL**
* **Redis**
* **JWT**
* **Docker**

## Architecture

```text
Client
   |
   +------ REST API ------+
   |                      |
   +------ WebSocket -----+
                          |
                    Node.js Backend
                          |
              +-----------+-----------+
              |                       |
          PostgreSQL                Redis
              |                       |
        Persistent Data      Cache / Pub-Sub /
                             Presence Management
```

## Repository

This repository contains the **backend service** for the Real-Time Chat Application.

The frontend application should be maintained as a separate repository to keep the frontend and backend independently deployable and maintainable.
