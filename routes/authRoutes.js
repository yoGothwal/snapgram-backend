const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');
const admin = require('firebase-admin');

router.post("/sessionLogin", async (req, res) => {
    const token = req.body.token;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
        const sessionCookie = await admin.auth().createSessionCookie(token, { expiresIn });
        res.cookie("authToken", sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: "strict",
        });
        res.status(200).send({ message: "Session created" });
    } catch (err) {
        console.error("Session creation failed:", err);
        res.status(401).send("UNAUTHORIZED");
    }
});

router.post("/sessionLogout", (req, res) => {
    res.clearCookie("authToken");
    res.status(200).send("Logged out");
});

router.post("/register", auth, async (req, res) => {
    const { uid, email } = req.user;
    const { name, bio, lat, lng, profilePicture } = req.body;
    const username = req.body.username || req.body.name?.toLowerCase().replace(/\s+/g, '') || `user${Date.now()}`;

    if (!uid || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
    }
    if (!name || !bio || !lat || !lng) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }
    try {
        let user = await User.findOne({ uid });
        if (user) {
            user.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
            await user.save();
            console.log("Logged in: ", user)
            return res.status(200).json(user);
        }
        else {
            user = new User({
                uid,
                name,
                username,
                email,
                bio,
                profilePicture,
                location: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                }
            });
            await user.save();
            return res.status(user ? 200 : 201).json(user);
        }

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;
