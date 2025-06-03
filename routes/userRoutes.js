const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

router.post("/register", auth, async (req, res) => {
    const { uid, email } = req.user;
    const { lat, lng } = [25.0949128, 76.5237134]; // Default coordinates for testing
    const { name, bio, profilePicture } = req.body;
    const username = req.body.username || req.body.name?.toLowerCase().replace(/\s+/g, '') || `user${Date.now()}`;
    console.log("req.body", req.body);

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
        return res.status(201).json(newUser);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.get("/nearby", auth, async (req, res) => {
    console.log("Fetching nearby users");
    const { lat, lng, radius } = req.query;
    const maxDistance = parseFloat(radius) * 1000; // Convert km to meters

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
                    $maxDistance: maxDistance
                }
            }
        }).select("-location -createdAt -__v");
        res.status(200).json(users);
        console.log("Nearby users fetched successfully", users.length);
    } catch (error) {
        console.error("Error fetching nearby users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;
