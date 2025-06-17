const WebSocket = require('ws')
const PORT = 8080
const server = new WebSocket.Server({ port: PORT })
console.log(`WebSocket server running on ws://localhost:${PORT}`);
require("dotenv").config()
const mongoose = require('mongoose');

const MONGODB_URI = process.env.NODE_ENV === "production" ? process.env.MONGO_URI : process.env.MONGO_URI_LOCAL;
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});
const Message = require("./models/Message")

const connections = new Map() // username -> websocket object
const chatHistory = new Map() // array of msg objects {"alice||bob:[msg1, msg2]"}

server.on('connection', (socket) => {
    let currentUser = null

    // Helper functions
    function sendError(socket, message) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "error",
                payload: message
            }));
        }
    }

    function broadcast(usernames, message) {
        const messageString = JSON.stringify(message);
        usernames.forEach(username => {
            const conn = connections.get(username);
            if (conn && conn.readyState === WebSocket.OPEN) {
                conn.send(messageString);
            }
        });
    }

    socket.on('message', async (data) => {
        try {
            const message = JSON.parse(data)
            switch (message.type) {
                case 'login':
                    await handleLogin(socket, message.username)
                    break
                case 'message':
                    await handleChatMessage(message)
                    break

                    break
                case 'get_history':
                    await sendHistory(socket, currentUser, message.withUser)
                    break
                default:
                    console.warn("Unknown message type: ", message.type)
            }
        } catch (error) {
            console.error("Error handling message:", error)
            sendError(socket, "Internal server error")
        }
    })

    socket.on('close', () => {
        if (currentUser) {
            connections.delete(currentUser)
            console.log(`${currentUser} disconnected!`)
        }
    })

    const handleLogin = async (socket, username) => {
        if (!username) {
            return sendError(socket, "Username required");
        }

        if (connections.has(username)) {
            return sendError(socket, "Username already in use");
        }

        currentUser = username
        connections.set(username, socket)
        console.log(`${username} connected`)

        socket.send(JSON.stringify({
            type: 'login_success',
            payload: { username }
        }))
    }

    const handleChatMessage = async (message) => {
        if ((!message.text && !message.imageUrl) || !message.to || !currentUser) {
            return sendError(connections.get(currentUser), "Message must cntain image or text");
        }

        try {
            const msgData = {
                sender: currentUser,
                receiver: message.to,
                text: message.text,
                imageUrl: message.imageUrl
            }

            const dbMsg = await Message.create(msgData)
            const responseMsg = {
                id: dbMsg._id.toString(),
                sender: dbMsg.sender,  // Fixed from currentUser to sender
                receiver: dbMsg.receiver,
                text: dbMsg.text,
                time: new Date(dbMsg.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: "2-digit"
                })
            }

            const userPair = [currentUser, message.to].sort().join('_')
            const history = chatHistory.get(userPair) || []
            history.push(responseMsg)
            chatHistory.set(userPair, history)

            broadcast([currentUser, message.to], {
                type: 'message',
                payload: responseMsg
            })

        } catch (err) {
            console.error("Message handling failed:", err)
            sendError(connections.get(currentUser), "Failed to send message")
        }
    }

    async function sendHistory(socket, user1, user2, limit = 50) {
        if (!user1 || !user2) {
            return sendError(socket, "Both users must be specified");
        }

        try {
            const key = [user1, user2].sort().join('_');
            let history = chatHistory.get(key);

            if (!history || history.length === 0) {
                history = await Message.find({
                    $or: [
                        { sender: user1, receiver: user2 },
                        { sender: user2, receiver: user1 }
                    ]
                })
                    .sort({ time: 1 })  // Oldest first for history
                    .limit(limit)
                    .lean();

                history = history.map(msg => ({
                    id: msg._id.toString(),
                    sender: msg.sender,
                    receiver: msg.receiver,
                    text: msg.text,
                    time: new Date(msg.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }));

                // Cache management
                if (history.length > 100) {
                    history = history.slice(-100);
                }
                chatHistory.set(key, history);
            }

            socket.send(JSON.stringify({
                type: 'history',
                payload: history
            }));

        } catch (err) {
            console.error("Failed to load history:", err);
            sendError(socket, "Could not load chat history");
        }
    }
})