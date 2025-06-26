const mongoose = require("mongoose");

// Gen Z names and emails
const genZNames = [
    { name: "Aiden", email: "aiden.rizz@snapmail.com" },
    { name: "Zoe", email: "zoe.y2k@snapmail.com" },
    { name: "Kai", email: "kai.slay@snapmail.com" },
    { name: "Maya", email: "maya.vibin@snapmail.com" },
    { name: "Jaxon", email: "jaxon.yeet@snapmail.com" },
    { name: "Nova", email: "nova.pog@snapmail.com" },
    { name: "Ryder", email: "ryder.skrt@snapmail.com" },
    { name: "Luna", email: "luna.stan@snapmail.com" },
    { name: "Theo", email: "theo.simp@snapmail.com" },
    { name: "Harper", email: "harper.flex@snapmail.com" },
    { name: "Milo", email: "milo.bussin@snapmail.com" },
    { name: "Isla", email: "isla.cap@snapmail.com" },
    { name: "Asher", email: "asher.sus@snapmail.com" },
    { name: "Ava", email: "ava.ghosted@snapmail.com" },
    { name: "Ezra", email: "ezra.bet@snapmail.com" },
    { name: "Scarlett", email: "scarlett.ratio@snapmail.com" },
    { name: "Leo", email: "leo.w@snapmail.com" },
    { name: "Stella", email: "stella.periodt@snapmail.com" },
    { name: "Finn", email: "finn.skull@snapmail.com" },
    { name: "Olivia", email: "olivia.cheugy@snapmail.com" }
];

// Additional profile pictures (20 more options)
const profilePictures = [
    "https://api.dicebear.com/6.x/adventurer/svg?seed=ace",
    "https://api.dicebear.com/6.x/big-smile/svg?seed=blue",
    "https://api.dicebear.com/6.x/croodles/svg?seed=charlie",
    "https://api.dicebear.com/6.x/identicon/svg?seed=delta",
    "https://api.dicebear.com/6.x/initials/svg?seed=echo",
    "https://api.dicebear.com/6.x/lorelei/svg?seed=foxtrot",
    "https://api.dicebear.com/6.x/micah/svg?seed=gamma",
    "https://api.dicebear.com/6.x/miniavs/svg?seed=hotel",
    "https://api.dicebear.com/6.x/notionists/svg?seed=india",
    "https://api.dicebear.com/6.x/open-peeps/svg?seed=juliet",
    "https://api.dicebear.com/6.x/personas/svg?seed=kilo",
    "https://api.dicebear.com/6.x/pixel-art/svg?seed=lima",
    "https://api.dicebear.com/6.x/shapes/svg?seed=mike",
    "https://api.dicebear.com/6.x/rings/svg?seed=november",
    "https://api.dicebear.com/6.x/avataaars/svg?seed=oscar",
    "https://api.dicebear.com/6.x/big-ears/svg?seed=papa",
    "https://api.dicebear.com/6.x/bottts/svg?seed=quebec",
    "https://api.dicebear.com/6.x/fun-emoji/svg?seed=romeo",
    "https://api.dicebear.com/6.x/thumbs/svg?seed=sierra",
    "https://api.dicebear.com/6.x/icons/svg?seed=tango"
];

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
        default: function () {
            const random = genZNames[Math.floor(Math.random() * genZNames.length)];
            return random.name;
        }
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false,
        default: null
    },
    email: {
        type: String,
        default: function () {
            const random = genZNames[Math.floor(Math.random() * genZNames.length)];
            return random.email;
        }
    },
    bio: {
        type: String,
        default: "Im using Snapgram!"
    },
    profilePicture: {
        type: String,
        default: function () {
            return profilePictures[Math.floor(Math.random() * profilePictures.length)];
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
}, { strict: 'throw' });

userSchema.pre('save', function (next) {
    if (!this.uid && !this.userId) {
        throw new Error("Either uid or userId must be provided");
    }
    if (this.uid && this.userId) {
        throw new Error("cannot have both uid and userId")
    }
    next();
});

userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);
module.exports = User;