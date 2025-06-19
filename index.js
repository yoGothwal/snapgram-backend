require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
const multer = require('multer')
const path = require('path')
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require("./routes/connectionRoutes")
const authRoutes = require("./routes/authRoutes")

const { startServer, app } = require("./server");

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = multer.memoryStorage()
const upload = multer({ storage })
const streamifier = require('streamifier')

// const upload = multer({
//     dest: 'uploads',
//     limits: {
//         fileSize: 5 * 1024 * 1024 // 5MB limit
//     },
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype.startsWith('image/')) {
//             cb(null, true);
//         } else {
//             cb(new Error('Only image files are allowed!'), false);
//         }
//     }
// });

// const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(cors({
    origin: [
        process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        'https://hello-lysv.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const a = 0
app.use(express.json());
app.use(cookieParser());

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
})

const MONGODB_URI = process.env.NODE_ENV === "production" ? process.env.MONGO_URI : process.env.MONGO_URI_LOCAL;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.post('/upload/image', upload.single('image'), async (req, res) => {
    console.log("hello")
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" })
        }
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: 'chat-app' }, (error, result) => result ? resolve(result) : reject(error))
                streamifier.createReadStream(buffer).pipe(stream)
            })
        }
        const result = await streamUpload(req.file.buffer)
        const optimizedUrl = cloudinary.url(result.public_id, {
            transformation: [{ quality: "auto" }]
        })
        res.json({ imageUrl: optimizedUrl, publicId: result.public_id })
    } catch (error) {
        console.error("Upload error :", error);
        res.status(500).json({ message: "Error uploading image" });
    }
})
app.post('/upload/audio', upload.single('audio'), async (req, res) => {
    console.log("hello")
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" })
        }
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: 'chat-app', resource_type: "video" }, (error, result) => result ? resolve(result) : reject(error))
                streamifier.createReadStream(buffer).pipe(stream)
            })
        }
        const result = await streamUpload(req.file.buffer)

        const optimizedUrl = cloudinary.url(result.public_id, {
            resource_type: "video", // Cloudinary treats audio as "video"
            transformation: [{ quality: "auto" }]
        })

        console.log(result)
        res.json({ audioUrl: optimizedUrl, publicId: result.public_id })
    } catch (error) {
        console.error("Upload error :", error);

        res.status(500).json({ message: "Error uploading image" });
    }
})
app.delete('/upload/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        await cloudinary.uploader.destroy(publicId);
        res.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Error deleting image" });
    }
});
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => res.send("WebSocket + Express running."));
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({ message: err.message });
    } else if (err) {
        // An unknown error occurred
        return res.status(500).json({ message: err.message });
    }
    next();
});



startServer();