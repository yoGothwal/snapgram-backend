const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
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
            if (["message", "image", 'audio'].includes(message.type)) return handleChatMessage(message);
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
        if ((!msg.text && !msg.imageUrl && !msg.audioUrl) || !msg.to || !currentUser)
            return sendError(connections.get(currentUser), "Missing message data");

        const msgData = {
            sender: currentUser,
            receiver: msg.to,
            text: msg.text,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl
        };

        const dbMsg = await Message.create(msgData);
        const responseMsg = {
            id: dbMsg._id.toString(),
            sender: dbMsg.sender,
            receiver: dbMsg.receiver,
            text: dbMsg.text,
            imageUrl: dbMsg.imageUrl,
            audioUrl: dbMsg.audioUrl,
            time: new Date(dbMsg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        const key = [currentUser, msg.to].sort().join("_");
        const history = chatHistory.get(key) || [];
        history.push(responseMsg);
        chatHistory.set(key, history);

        broadcast([currentUser, msg.to], { type: "message", payload: responseMsg });
    }
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
                audioUrl: msg.audioUrl,
                time: new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }));

            if (history.length > 100) history = history.slice(-100);
            chatHistory.set(key, history);
        }

        sock.send(JSON.stringify({ type: "history", payload: history }));
    }
});



const startServer = () => {
    server.listen(PORT, () => console.log(`WSS: server on http://localhost:${PORT}`));
};

// Export app and server
module.exports = { app, server, startServer };
