const router = require('express').Router();
const User = require('../models/User');
const Notification = require('../models/Notification')
const auth = require('../middlewares/auth');


router.post("/register", auth, async (req, res) => {
    const { uid, email } = req.user;
    const { name, bio, lat, lng, profilePicture } = req.body;
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
    const { lat, lng, radius } = req.query;
    const maxDistance = radius * 1000
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
    } catch (error) {
        console.error("Error fetching nearby users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.put("/update-location", auth, async (req, res) => {
    console.log(1)
    const { uid } = req.user;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
    }

    try {
        const user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.location = {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
        };
        await user.save();
        res.status(200).json({ message: "Location updated" });
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/follow/:id", auth, async (req, res) => {
    const { id } = req.params
    const userToFollow = await User.findById(id);
    const currentUser = await User.findOne({ uid: req.user.uid });
    const currentUserId = currentUser._id
    if (id === currentUserId) res.status(400).json({ message: "Can not follow yourself" })

    try {
        if (!userToFollow.followers.includes(currentUserId)) {
            userToFollow.followers.push(currentUserId);
            currentUser.following.push(id);
            await userToFollow.save();
            await currentUser.save();
        }
        const newNotification = new Notification({
            user: userToFollow._id,
            from: currentUser._id,
            message: `${currentUser.username} started following you`,
            type: "follow"
        })
        await newNotification.save()
        console.log("notification saved")
        console.log("followed")
        return res.status(200).json({ msg: "Followed" });
    } catch (error) {
        console.log("already following")
        return res.status(400).json({ msg: "Already following" });

    }
})
router.post("/unfollow/:id", auth, async (req, res) => {
    console.log("unfol")
    const { id } = req.params;
    const userToUnfollow = await User.findById(id);
    const currentUser = await User.findOne({ uid: req.user.uid });
    const currentUserId = currentUser._id

    if (id === currentUserId)
        return res.status(400).json({ message: "Cannot unfollow yourself" });

    try {
        //         Q: Why was the unfollow route not updating the database correctly even though "unfollowed" was logged?
        // A: The issue was due to comparing a string ID with a MongoDB ObjectId. Using .toString() ensures both values are strings, allowing accurate comparison and filtering of followers/following arrays.

        if (userToUnfollow.followers.includes(currentUserId)) {
            userToUnfollow.followers = userToUnfollow.followers.filter(
                (followerId) => followerId.toString() !== currentUserId.toString()
            );
            currentUser.following = currentUser.following.filter(
                (followedId) => followedId.toString() !== userToUnfollow._id.toString()
            );
            await userToUnfollow.save();
            await currentUser.save();
        }
        console.log("unfollowed")
        return res.status(200).json({ msg: "Unfollowed" });
    } catch (error) {
        return res.status(500).json({ msg: "Error unfollowing user" });
    }
});
router.get("/notifications", auth, async (req, res) => {
    try {
        let user = await User.findOne({ uid: req.user.uid });
        const notifications = await Notification.find({ user: user._id }).populate("from", "username profilePicture").sort({ createdAt: -1 })
        res.status(200).json(notifications)
    } catch (error) {
        console.log("error fetching notifications", error)
        res.status(500).json({ message: "Internal server error" });

    }
})
router.put("/notifications/:id/seen", auth, async (req, res) => {
    console.log("hi")
    try {
        await Notification.findByIdAndUpdate(req.params.id, { seen: true });
        res.status(200).json({ message: "Marked as seen" });
    } catch (error) {
        console.error("Mark seen error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:username", auth, async (req, res) => {
    const { username } = req.params
    console.log("username", username)
    const user = await User.findOne({ username: username })
    return res.status(201).json({ user: user })
})
module.exports = router;
