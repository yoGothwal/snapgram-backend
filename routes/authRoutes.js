const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

router.post(`/signup`, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" })
    }
    try {
        const user = await User.findOne({ username })
        if (user) {
            return res.status(400).json({ message: "Username already exists" })
        }
        const userId = new User()._id;
        const hashedPswd = await bcrypt.hash(password, 10)
        const newUser = new User({
            userId: userId.toString(),
            username: username.trim().toLocaleLowerCase(),
            password: hashedPswd
        })
        await newUser.save()

        const { password: _, ...userData } = newUser.toObject()
        const token = jwt.sign({ userId: userData.userId, username: userData.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.status(201).json({ message: "User created successfully", user: userData, token, coords: { lat: 0, lng: 0 } })

    } catch (e) {
        console.error("errorn in sigining in", e)
        res.status(500).json({ message: "internal error" })
    }
})
router.get(`/validateUsername/:username`, async (req, res) => {
    const { username } = req.params
    console.log("Validating", username)
    if (username.trim().length === 0) {
        return res.json({ valid: false, message: "Username can't be vacant" })
    }
    try {
        const u = username.trim().toLocaleLowerCase()
        const user = await User.findOne({ username })
        if (user && user.username.trim().toLocaleLowerCase() === u) {
            return res.status(400).json({ valid: false, message: "username already exists" })
        }
        res.status(200).json({ valid: true, message: `username ${u} is available`, user })
    } catch (e) {
        console.error("error in validating username", e)
        res.status(500).json({ valid: false, message: 'Server error' })
    }
})
router.post("/register", auth, async (req, res) => {
    console.log("register route")
    const { name, bio, lat, lng, profilePicture } = req.body;
    const username = req.body.username || req.body.name?.toLowerCase().replace(/\s+/g, '') || `user${Date.now()}`;
    if (!req.user.uid) {
        return res.status(400).json({ message: "uid not available" });
    }
    const query = req.user.uid

    if (!name || !bio || !lat || !lng) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }
    try {
        let user = await User.findOne(query);
        if (user) {
            user.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
            await user.save();
            console.log("Logged in: ", user.name)
            return res.status(200).json(user);
        }
        else {
            user = new User({
                ...(req.user.uid),
                name,
                username,
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
