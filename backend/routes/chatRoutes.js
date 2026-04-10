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

    // 2. Danh sách các model ưu tiên (Fallback tự động)
    // Thêm các models khác làm dự phòng cực mạnh trong trường hợp mạng quá căng thẳng
    const modelNames = [
      "gemini-2.5-flash", 
      "gemini-2.5-flash-lite", 
      "gemini-flash-latest", 
      "gemini-flash-lite-latest"
    ];
    let reply = "";
    
    // 3. Thử lần lượt các model
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chatSession = model.startChat({
          history: history.map(item => ({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.text }],
          })),
        });
        
        const result = await chatSession.sendMessage(message);
        reply = result.response.text();
        // Nếu lấy được kết quả thì thoát vòng lặp ngay
        break; 
      } catch (err) {
        console.warn(`[Cảnh báo] Model ${modelName} gặp lỗi/quá tải, đang thử model tiếp theo...`);
        // Lỗi thì chạy tiếp sang model kế tiếp
      }
    }

    if (!reply) {
      throw new Error("Tất cả hệ thống AI hiện đều đang quá tải, vui lòng thử lại sau vài giây.");
    }

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