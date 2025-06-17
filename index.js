const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require("./routes/connectionRoutes")
const authRoutes = require("./routes/authRoutes")
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(
    cors({
        credentials: true,
    })
);
app.use(cookieParser());

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
})
const PORT = process.env.PORT || 5000;

const MONGODB_URI = process.env.NODE_ENV === "production" ? process.env.MONGO_URI : process.env.MONGO_URI_LOCAL;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});