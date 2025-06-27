const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
console.log("MONGO_URI =", process.env.MONGO_URI);

const mongoose = require("mongoose");
const User = require("./models/User");
const Notification = require('./models/Notification');
const Relationship = require('./models/Relationship');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Like = require('./models/Like');

async function syncIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        await User.syncIndexes();
        await Like.syncIndexes();
        await Message.syncIndexes();
        await Notification.syncIndexes();
        await Relationship.syncIndexes();
        await Post.syncIndexes();

        console.log("✅ Indexes synced with Atlas");
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to sync indexes:", err);
        process.exit(1);
    }
}

// Call the async function
syncIndexes();