const express = require("express");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require("../models/Chat");
const protect = require("../middleware/authMiddleware"); // Sửa lại đúng tên hàm middleware của bạn

const router = express.Router();

// 1. Khởi tạo danh sách API Keys từ .env (hỗ trợ xoay tua nhiều key)
const apiKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(k => k);
if (apiKeys.length === 0) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not defined in .env");
}

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
    const modelNames = [
      "gemini-2.5-flash", 
      "gemini-2.0-flash", 
      "gemini-1.5-flash", 
      "gemini-flash-latest"
    ];

    let reply = "";
    let finalError = null;

    // 3. VÒNG LẶP 1: Thử qua từng API Key (Xoay tua Key)
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      const genAI = new GoogleGenerativeAI(currentKey);

      // 4. VÒNG LẶP 2: Thử qua từng Model cho Key hiện tại (Xoay tua Model)
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
          
          if (reply) break; // Thành công thì thoát khỏi vòng lặp model
        } catch (err) {
          finalError = err;
          const isRateLimit = err.message.includes("429") || err.message.toLowerCase().includes("quota");
          
          if (isRateLimit) {
            console.warn(`[Key ${i+1}] Hết lượt (429). Đang chuyển sang Key tiếp theo...`);
            break; // Nếu hết hạn mức của Key này, bỏ qua các model khác và nhảy sang Key mới luôn
          } else {
            console.warn(`[Key ${i+1}][Model ${modelName}] Lỗi: ${err.message.split('\n')[0]}. Thử model tiếp theo...`);
          }
        }
      }

      if (reply) {
        console.log(`=> Thành công với Key số ${i+1}`);
        break; // Thành công thì thoát khỏi vòng lặp key
      }
    }

    if (!reply) {
      throw new Error(finalError ? finalError.message : "Tất cả các API Keys và Models đều đang bận, vui lòng thử lại sau.");
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