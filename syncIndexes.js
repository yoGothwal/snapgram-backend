const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") }); // force load
console.log("MONGO_URI =", process.env.MONGO_URI); // check if it's loaded

const mongoose = require("mongoose");
const User = require("./models/User"); // adjust path

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await User.syncIndexes();
        console.log("✅ Indexes synced with Atlas");
        process.exit();
    } catch (err) {
        console.error("❌ Failed to sync indexes:", err);
        process.exit(1);
    }
})();
