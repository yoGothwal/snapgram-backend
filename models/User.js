const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: function () { return !this.userId },
        default: undefined,
        unique: true,
        sparse: true
    },
    userId: {
        type: String,
        required: function () { return !this.uid },
        default: undefined,
        unique: true,
        sparse: true
    },
    name: {
        type: String,
        default: "Adam",
    },
    username: {
        type: String, required: true, unique: true
    },
    password: {
        type: String,
        select: false,
        default: null
    },
    email: {
        type: String,
        default: "Adam@gmail.com",
    },
    bio: {
        type: String,
        default: "Im using Snapgram!"
    },
    profilePicture: {
        type: String,
        default: function () {
            const defaults = [
                "https://api.dicebear.com/6.x/bottts-neutral/svg?seed=alpha",
                "https://api.dicebear.com/6.x/fun-emoji/svg?seed=banana",
                "https://api.dicebear.com/6.x/lorelei-neutral/svg?seed=cookie",
                "https://api.dicebear.com/6.x/big-ears-neutral/svg?seed=daisy",
                "https://api.dicebear.com/6.x/thumbs/svg?seed=echo"
            ];
            return defaults[Math.floor(Math.random() * defaults.length)];
        }
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
}, { strict: 'throw' })



userSchema.pre('save', function (next) {
    if (!this.uid && !this.userId) {
        throw new Error("Either uid or userId must be provided");
    }
    if (this.uid && this.userId) {
        throw new Error("cannot have both uid and userId")
    }
    next();
})
userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);
module.exports = User;