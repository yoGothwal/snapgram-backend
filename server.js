const WebSocket = require('ws')
const PORT = 8080
const { v4: uuidv4 } = require('uuid');
const server = new WebSocket.Server({ port: PORT })
console.log(`WebSocker server running on ws://localhost:${PORT}`);

const connections = new Map() //username -> websocket object
const chatHistory = new Map() // array of msg objects {"alice||bob:[msg1, msg2]"}
server.on('connection', (socket) => {
    let currentUser = null
    socket.on('message', (data) => {
        try {
            const message = JSON.parse(data)
            switch (message.type) {
                case 'login':
                    handleLogin(socket, message.username)
                    break
                case 'message':
                    handleChatMessage(message)
                    break
                case 'get_history':
                    sendHistory(socket, currentUser, message.withUser)
                default:
                    console.warn("Unknown message type: ", message.type)
            }
        } catch (error) {
            console.error("Error parsing message:", error)
        }
    })

    socket.on('close', () => {
        if (currentUser) {
            connections.delete(currentUser)
            console.log(`${currentUser} disconnected!`)
        }
    })
    function handleLogin(socket, username) {
        if (!username) {
            socket.send(JSON.stringify({
                type: "error",
                payload: "Username required"
            }))
            return
        }
        currentUser = username
        connections.set(username, socket)
        console.log(`${username} connected`)
        socket.send(JSON.stringify({
            type: 'login_success',
            payload: { username }
        }))
    }
    function handleChatMessage(message) {
        if (!message.text || !message.to || !currentUser) {
            socket.send(JSON.stringify({
                type: "error",
                payload: "Invalid message format"
            }))
            return
        }

        const msg = {
            id: uuidv4(),
            sender: currentUser,
            text: message.text,
            time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: "2-digit"
            })
        }

        const userPair = [currentUser, message.to].sort().join('_')
        const history = chatHistory.get(userPair) || []
        history.push(msg)
        chatHistory.set(userPair, history)

        if (connections.has(currentUser)) {
            connections.get(currentUser).send(JSON.stringify({
                type: 'message',
                payload: msg
            }))
        }
        if (connections.has(message.to)) {
            connections.get(message.to).send(JSON.stringify({
                type: 'message',
                payload: msg
            }))
        }
    }
    function sendHistory(socket, user1, user2) {
        if (!user1 || !user2) return
        const key = [user1, user2].sort().join('_')
        const history = chatHistory.get(key) || []
        socket.send(JSON.stringify({
            type: 'history',
            payload: history
        }))

    }
})
