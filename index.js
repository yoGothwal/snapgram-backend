const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer')
const path = require('path')
const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require("./routes/connectionRoutes")
const authRoutes = require("./routes/authRoutes")
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
})


const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.NODE_ENV === "production" ? process.env.MONGO_URI : process.env.MONGO_URI_LOCAL;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});
app.post('/upload', upload.single('image'), async (req, res) => {
    console.log("hello")
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" })
        }
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "chat-app"
        })
        const optimizedUrl = cloudinary.url(result.public_id, {
            transformation: [{ quality: "auto" }]
        })
        const fs = require('fs')
        fs.unlinkSync(req.file.path)
        // const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        console.log(result)
        res.json({ imageUrl: optimizedUrl, publicId: result.publicId })
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const { startServer } = require("./server");
startServer();

// (async function () {

//     // Configuration
//     cloudinary.config({
//         cloud_name: 'ddzrskuzb',
//         api_key: '842511624542552',
//         api_secret: '<your_api_secret>' // Click 'View API Keys' above to copy your API secret
//     });

//     // Upload an image
//     const uploadResult = await cloudinary.uploader
//         .upload(
//             'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//             public_id: 'shoes',
//         }
//         )
//         .catch((error) => {
//             console.log(error);
//         });

//     console.log(uploadResult);

//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });

//     console.log(optimizeUrl);

//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });

//     console.log(autoCropUrl);
// })();