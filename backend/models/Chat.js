const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "model"],
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    userMessage: {
      type: String,
      required: true
    },
    aiMessage: {
      type: String,
      required: true
    },
    messages: [messageSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Chat", chatSchema);