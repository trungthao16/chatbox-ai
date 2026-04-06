const express = require("express");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require("../models/Chat");
const protect = require("../middleware/authMiddleware"); // Sửa lại đúng tên hàm middleware của bạn

const router = express.Router();

// 1. Sửa lỗi: Khởi tạo đúng tên class GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Bảo vệ toàn bộ API chat bằng JWT
router.use(protect);

// GET lịch sử chat
router.get("/history", async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy lịch sử chat",
      error: error.message
    });
  }
});

// POST chat với Gemini
router.post("/", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tin nhắn không được để trống"
      });
    }

    // 2. Cấu hình Model - Đổi thành model được hỗ trợ bởi API key của bạn
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. Chuyển lịch sử về format chuẩn của Google SDK
    // Lưu ý: role phải là 'user' và 'model'
    const chatSession = model.startChat({
      history: history.map(item => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      })),
    });

    // 4. Gửi tin nhắn mới
    const result = await chatSession.sendMessage(message);
    const reply = result.response.text();

    // 5. Lưu vào Database
    const savedChat = await Chat.create({
      userId: req.user.id,
      userMessage: message,
      aiMessage: reply,
      messages: [
        ...history,
        { role: "user", text: message },
        { role: "model", text: reply }
      ]
    });

    res.json({
      success: true,
      reply,
      chatId: savedChat._id
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi gọi Gemini API",
      error: error.message
    });
  }
});

module.exports = router;