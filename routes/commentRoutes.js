const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post')
const Like = require('../models/Like')
const Comment = require('../models/Comment')

const auth = require('../middlewares/auth');

router.get("/:postId", auth, async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.postId }).populate("user", "username profilePicture")
        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json({ message: "Error fetching liked posts" });
    }
});

router.post("/", auth, async (req, res) => {
    console.log("helloo")
    const user = req.body.userId
    const post = req.body.postId
    const content = req.body.comment
    console.log(req.body)
    if (!user || !post || !content) {
        return res.status(400).json({ message: "missing userId or postId or content" })
    }
    try {

        const newComment = new Comment({
            user: req.body.userId,
            post: req.body.postId,
            content
        })
        await newComment.save()
        await Post.findByIdAndUpdate(req.body.postId, { $inc: { commentsCount: 1 } })
        res.status(201).json({ message: "comment added successfully." });

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
        const comment = await Comment.findOneAndDelete({ post: postId, user: userId });

        if (!comment) {
            return res.status(404).json({ message: "Like not found" });
        }

        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });

        return res.status(200).json({ message: "Like removed successfully" });
    } catch (error) {
        console.error("Delete like error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
