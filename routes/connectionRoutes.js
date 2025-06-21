const router = require('express').Router()
const auth = require('../middlewares/auth');


const Connection = require("../models/Relationship");
const User = require('../models/User');

router.get("/:username", auth, async (req, res) => {
    const username = req.params.username
    try {
        const user = await User.findOne({ username })
        if (!user) {
            res.status(400).json({ message: "User not found" })
        }
        const followers = await Connection.find({ following: user._id }).populate("follower");
        const followings = await Connection.find({ follower: user._id }).populate("following");

        res.status(200).json({ message: "Get route working", followers, followings })
    } catch (error) {
        console.log("Error in finding followers/following: ", error)
        res.status(500).json({ Message: "Internal Server Error" })
    }
})
module.exports = router