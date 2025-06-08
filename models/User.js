const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    username: {
        type: String, required: true, unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    bio: {
        type: String,
        default: ""
    },
    profilePicture: {
        type: String,
        default: "https://example.com/default-profile-picture.png"
    },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    followerCount: {
        type: Number,
        default: 0,
    },
    followingCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
})
userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);
module.exports = User;