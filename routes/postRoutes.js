const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post')
const auth = require('../middlewares/auth');

const multer = require('multer')
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = multer.memoryStorage()
const upload = multer({ storage })
const streamifier = require('streamifier')

router.get('/:username', auth, async (req, res) => {

    const { username } = req.params
    const currentUser = await User.findOne({ username });
    try {
        const result = await Post.find({ user: currentUser._id }).populate("user", "username profilePicture")
        res.status(200).json(result)
    } catch (error) {
        console.error("error in getting posts", error)
        res.status(500).json({ message: "Internal error", error: error })
    }
})
router.post('/:username', auth, async (req, res) => {


})
router.get('/', auth, async (req, res) => {
    try {
        const result = await Post.find().populate("user", "username profilePicture")
        res.status(200).json(result)
    } catch (error) {
        console.error("error in getting posts", error)
        res.status(500).json({ message: "Internal error", error: error })
    }
})
router.post("/", auth, upload.single('image'), async (req, res) => {
    console.log("helloo")
    const query = req.user.system === 'FIREBASE' ? { uid: req.user.uid } : { userId: req.user.userId }
    try {
        const currentUser = await User.findOne(query);
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: 'chat-app/posts/photos' }, (error, result) => result ? resolve(result) : reject(error))
                streamifier.createReadStream(buffer).pipe(stream)
            })
        }
        const result = await streamUpload(req.file.buffer)
        const optimizedUrl = cloudinary.url(result.public_id, {
            transformation: [{ quality: "auto" }]
        })
        const newPost = new Post({
            user: currentUser._id,
            caption: req.body.caption,
            image: optimizedUrl
        })
        await newPost.save()
        res.status(201).json({ message: "Post created", imageurl: optimizedUrl })

    } catch (error) {
        console.error("Posting error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
