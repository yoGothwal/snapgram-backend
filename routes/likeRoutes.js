const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post')
const Like = require('../models/Like')

const auth = require('../middlewares/auth');

router.get("/:userId", auth, async (req, res) => {
    try {
        const likes = await Like.find({ user: req.params.userId }).select("post");
        const likedPostIds = likes.map((like) => like.post.toString());
        res.status(200).json(likedPostIds);
    } catch (err) {
        res.status(500).json({ message: "Error fetching liked posts" });
    }
});

router.post("/", auth, async (req, res) => {
    console.log("helloo")
    if (!req.body.userId || !req.body.postId) {
        return res.status(400).json({ message: "missing userId or postId" })
    }
    try {
        const alreadyLiked = await Like.findOne({ post: req.body.postId, user: req.body.userId })
        if (alreadyLiked) {
            return res.status(400).json({ message: "already liked" })
        }
        const newLike = new Like({
            user: req.body.userId,
            post: req.body.postId
        })
        await newLike.save()
        await Post.findByIdAndUpdate(req.body.postId, { $inc: { likesCount: 1 } })
        res.status(201).json({ message: "Like added successfully." });

    } catch (error) {
        console.error("Posting error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/", auth, async (req, res) => {
    console.log("helloo");
    const { userId, postId } = req.body;

    if (!userId || !postId) {
        return res.status(400).json({ message: "missing userId or postId" });
    }

    try {
        const like = await Like.findOneAndDelete({ post: postId, user: userId });

        if (!like) {
            return res.status(404).json({ message: "Like not found" });
        }

        await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

        return res.status(200).json({ message: "Like removed successfully" });
    } catch (error) {
        console.error("Delete like error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
