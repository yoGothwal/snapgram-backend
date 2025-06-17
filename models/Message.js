const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    imageUrl: String,
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    time: { type: Date, default: Date.now() }
})
messageSchema.index({ sender: 1, receiver: 1 });
module.exports = mongoose.model("Message", messageSchema)