const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

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
            // If user exists, return their data
            return res.status(200).json(user);
        }
        const newUser = new User({
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
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.get("/nearby", auth, async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ message: "Please provide latitude and longitude" });
    }
    try {
        const users = await User.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 1000000 // 1000 km
                }
            }
        }).select("-location -createdAt -__v");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching nearby users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;
