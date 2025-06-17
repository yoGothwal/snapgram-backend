// const WebSocket = require('ws')
// const PORT = 8080
// const server = new WebSocket.Server({ port: PORT })
// console.log(`WebSocket server running on ws://localhost:${PORT}`);
// require("dotenv").config()
// const mongoose = require('mongoose');

// const MONGODB_URI = process.env.NODE_ENV === "production" ? process.env.MONGO_URI : process.env.MONGO_URI_LOCAL;
// mongoose.connect(MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log("MongoDB connected");
// }).catch((err) => {
//     console.error("Error connecting to MongoDB:", err);
// });
// const Message = require("./models/Message")

// const connections = new Map() // username -> websocket object
// const chatHistory = new Map() // array of msg objects {"alice||bob:[msg1, msg2]"}

// server.on('connection', (socket) => {
//     let currentUser = null

//     // Helper functions
//     function sendError(socket, message) {
//         if (socket.readyState === WebSocket.OPEN) {
//             socket.send(JSON.stringify({
//                 type: "error",
//                 payload: message
//             }));
//         }
//     }

//     function broadcast(usernames, message) {
//         const messageString = JSON.stringify(message);
//         usernames.forEach(username => {
//             const conn = connections.get(username);
//             if (conn && conn.readyState === WebSocket.OPEN) {
//                 conn.send(messageString);
//             }
//         });
//     }

//     socket.on('message', async (data) => {
//         try {
//             const message = JSON.parse(data)
//             switch (message.type) {
//                 case 'login':
//                     await handleLogin(socket, message.username)
//                     break
//                 case 'message':
//                 case 'image':
//                     await handleChatMessage(message)
//                     break
//                 case 'get_history':
//                     await sendHistory(socket, currentUser, message.withUser)
//                     break
//                 default:
//                     console.warn("Unknown message type: ", message.type)
//             }
//         } catch (error) {
//             console.error("Error handling message:", error)
//             sendError(socket, "Internal server error")
//         }
//     })

//     socket.on('close', () => {
//         if (currentUser) {
//             connections.delete(currentUser)
//             console.log(`${currentUser} disconnected!`)
//         }
//     })

//     const handleLogin = async (socket, username) => {
//         if (!username) {
//             return sendError(socket, "Username required");
//         }

//         if (connections.has(username)) {
//             return sendError(socket, "Username already in use");
//         }

//         currentUser = username
//         connections.set(username, socket)
//         console.log(`${username} connected`)

//         socket.send(JSON.stringify({
//             type: 'login_success',
//             payload: { username }
//         }))
//     }

//     const handleChatMessage = async (message) => {
//         if ((!message.text && !message.imageUrl) || !message.to || !currentUser) {
//             return sendError(connections.get(currentUser), "Message must cntain image or text");
//         }

//         try {
//             const msgData = {
//                 sender: currentUser,
//                 receiver: message.to,
//                 text: message.text,
//                 imageUrl: message.imageUrl
//             }

//             const dbMsg = await Message.create(msgData)
//             const responseMsg = {
//                 id: dbMsg._id.toString(),
//                 sender: dbMsg.sender,  // Fixed from currentUser to sender
//                 receiver: dbMsg.receiver,
//                 text: dbMsg.text,
//                 imageUrl: dbMsg.imageUrl,
//                 time: new Date(dbMsg.time).toLocaleTimeString([], {
//                     hour: '2-digit',
//                     minute: "2-digit"
//                 })
//             }

//             const userPair = [currentUser, message.to].sort().join('_')
//             const history = chatHistory.get(userPair) || []
//             history.push(responseMsg)
//             chatHistory.set(userPair, history)

//             broadcast([currentUser, message.to], {
//                 type: 'message',
//                 payload: responseMsg
//             })

//         } catch (err) {
//             console.error("Message handling failed:", err)
//             sendError(connections.get(currentUser), "Failed to send message")
//         }
//     }

//     async function sendHistory(socket, user1, user2, limit = 50) {
//         if (!user1 || !user2) {
//             return sendError(socket, "Both users must be specified");
//         }

//         try {
//             const key = [user1, user2].sort().join('_');
//             let history = chatHistory.get(key);

//             if (!history || history.length === 0) {
//                 history = await Message.find({
//                     $or: [
//                         { sender: user1, receiver: user2 },
//                         { sender: user2, receiver: user1 }
//                     ]
//                 })
//                     .sort({ time: 1 })  // Oldest first for history
//                     .limit(limit)
//                     .lean();

//                 history = history.map(msg => ({
//                     id: msg._id.toString(),
//                     sender: msg.sender,
//                     receiver: msg.receiver,
//                     text: msg.text,
//                     imageUrl: msg.imageUrl,
//                     time: new Date(msg.time).toLocaleTimeString([], {
//                         hour: '2-digit',
//                         minute: '2-digit'
//                     })
//                 }));

//                 // Cache management
//                 if (history.length > 100) {
//                     history = history.slice(-100);
//                 }
//                 chatHistory.set(key, history);
//             }

//             socket.send(JSON.stringify({
//                 type: 'history',
//                 payload: history
//             }));

//         } catch (err) {
//             console.error("Failed to load history:", err);
//             sendError(socket, "Could not load chat history");
//         }
//     }
// })

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const Message = require("./models/Message");

const connections = new Map();
const chatHistory = new Map();

const MONGODB_URI = process.env.NODE_ENV === "production"
    ? process.env.MONGO_URI
    : process.env.MONGO_URI_LOCAL;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("WSS: MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));

wss.on("connection", (socket) => {
    let currentUser = null;

    function sendError(sock, message) {
        if (sock.readyState === WebSocket.OPEN) {
            sock.send(JSON.stringify({ type: "error", payload: message }));
        }
    }

    function broadcast(usernames, message) {
        const msg = JSON.stringify(message);
        usernames.forEach(user => {
            const conn = connections.get(user);
            if (conn?.readyState === WebSocket.OPEN) conn.send(msg);
        });
    }

    socket.on("message", async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === "login") return handleLogin(socket, message.username);
            if (["message", "image"].includes(message.type)) return handleChatMessage(message);
            if (message.type === "get_history") return sendHistory(socket, currentUser, message.withUser);
        } catch (err) {
            console.error("Msg error:", err);
            sendError(socket, "Internal server error");
        }
    });

    socket.on("close", () => {
        if (currentUser) connections.delete(currentUser);
    });

    async function handleLogin(sock, username) {
        if (!username) return sendError(sock, "Username required");
        if (connections.has(username)) return sendError(sock, "Already connected");
        currentUser = username;
        connections.set(username, sock);
        console.log(`WSS: ${username} connected`)

        sock.send(JSON.stringify({ type: "login_success", payload: { username } }));
    }

    async function handleChatMessage(msg) {
        if ((!msg.text && !msg.imageUrl) || !msg.to || !currentUser)
            return sendError(connections.get(currentUser), "Missing message data");

        const msgData = {
            sender: currentUser,
            receiver: msg.to,
            text: msg.text,
            imageUrl: msg.imageUrl
        };

        const dbMsg = await Message.create(msgData);
        const responseMsg = {
            id: dbMsg._id.toString(),
            sender: dbMsg.sender,
            receiver: dbMsg.receiver,
            text: dbMsg.text,
            imageUrl: dbMsg.imageUrl,
            time: new Date(dbMsg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        const key = [currentUser, msg.to].sort().join("_");
        const history = chatHistory.get(key) || [];
        history.push(responseMsg);
        chatHistory.set(key, history);

        broadcast([currentUser, msg.to], { type: "message", payload: responseMsg });
    }
    const a = 8
    async function sendHistory(sock, u1, u2, limit = 50) {
        if (!u1 || !u2) return sendError(sock, "Need two users");

        const key = [u1, u2].sort().join("_");
        let history = chatHistory.get(key);

        if (!history) {
            history = await Message.find({
                $or: [{ sender: u1, receiver: u2 }, { sender: u2, receiver: u1 }]
            }).sort({ time: 1 }).limit(limit).lean();

            history = history.map(msg => ({
                id: msg._id.toString(),
                sender: msg.sender,
                receiver: msg.receiver,
                text: msg.text,
                imageUrl: msg.imageUrl,
                time: new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }));

            if (history.length > 100) history = history.slice(-100);
            chatHistory.set(key, history);
        }

        sock.send(JSON.stringify({ type: "history", payload: history }));
    }
});

app.get("/", (req, res) => res.send("WebSocket + Express running."));

const startServer = () => {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => console.log(`WSS: server on http://localhost:${PORT}`));
};

// Export app and server
module.exports = { app, server, startServer };
