const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

const Notification = require('../models/Notification')
const Relationship = require('../models/Relationship');
const followService = require('../services/followService');

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

    const { lat, lng } = req.body;
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }


    if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
    }
    try {
        const user = await User.findOne(query);
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
    console.log("hello")
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }

    try {
        const currentUser = await User.findOne(query);
        const currentUserId = currentUser._id;
        const userToFollowId = req.params.id;
        const result = await followService.followUser(currentUserId, userToFollowId);

        if (result.notification) {
            await Notification.create(result.notification);
        }

        res.status(200).json({ message: result.message });
    } catch (error) {
        console.error("Follow error:", error);
        res.status(error.status || 500).json({ message: error.message });
    }
});

router.post("/unfollow/:id", auth, async (req, res) => {
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }

    try {
        const currentUser = await User.findOne(query);

        const currentUserId = currentUser._id;
        const userToUnfollowId = req.params.id;

        const result = await followService.unfollowUser(currentUserId, userToUnfollowId);

        if (result.notificationDeleted) {
            await Notification.deleteOne(result.notificationDeleted);
        }

        res.status(200).json({ message: result.message });
    } catch (error) {
        console.error("Unfollow error:", error);
        res.status(error.status || 500).json({ message: error.message });
    }
});
router.get("/notifications", auth, async (req, res) => {
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }

    try {
        let user = await User.findOne(query);
        const notifications = await Notification.find({ user: user._id }).populate("from", "username profilePicture").sort({ createdAt: -1 })
        res.status(200).json(notifications)
    } catch (error) {
        console.log("error fetching notifications", error)
        res.status(500).json({ message: "Internal server error" });

    }
})
router.put("/notifications/:id/seen", auth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { seen: true });
        res.status(200).json({ message: "Marked as seen" });
    } catch (error) {
        console.error("Mark seen error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:username", auth, async (req, res) => {
    console.log("helloo")
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }

    try {
        const currentUser = await User.findOne(query);

        const currentUserId = currentUser._id;
        const username = req.params.username;
        const user = await User.findOne({ username });
        console.log(user.name)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isFollowing = await Relationship.exists({
            follower: currentUserId,
            following: user._id
        });

        res.status(200).json({
            user,
            isFollowing: !!isFollowing
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.put('/:username', auth, async (req, res) => {
    const username = req.params.username;

    try {
        const updated = {
            name: req.body.name,
            bio: req.body.bio,
            profilePicture: req.body.profilePicture
        }
        const savedUser = await User.findOneAndUpdate({ username }, { $set: updated }, { new: true, runValidators: true })
        res.status(201).json(savedUser)
    } catch (error) {
        console.error("Profile aditing:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;
