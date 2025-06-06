const { default: mongoose } = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String,
    message: String,
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})
module.exports = mongoose.model('Notification', notificationSchema)