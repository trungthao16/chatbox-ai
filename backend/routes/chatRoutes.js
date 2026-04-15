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

    // 2. Danh sách các model ưu tiên (gemini-2.0-flash format gọn hơn 2.5)
    const modelNames = [
      "gemini-2.0-flash", 
      "gemini-2.5-flash",
      "gemini-1.5-flash", 
      "gemini-flash-latest"
    ];

    // System instruction để Gemini format response gọn gàng
    const systemInstruction = "Trả lời bằng Markdown chuẩn. Viết các câu liền mạch trong cùng một đoạn văn, không xuống dòng giữa chừng trong một ý. Chỉ dùng xuống dòng kép (dòng trống) khi chuyển sang ý/đoạn mới. Không tách các từ in đậm hoặc in nghiêng ra dòng riêng.";

    let reply = "";
    let finalError = null;

    // 3. VÒNG LẶP NGOÀI: Thử từng Model theo độ ưu tiên
    for (const modelName of modelNames) {
      
      // 4. VÒNG LẶP TRONG: Thử model đó trên TẤT CẢ các API Key hiện có
      for (let i = 0; i < apiKeys.length; i++) {
        const currentKey = apiKeys[i];
        
        try {
          const genAI = new GoogleGenerativeAI(currentKey);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction
          });
          const chatSession = model.startChat({
            history: history.map(item => ({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }],
            })),
          });

          const result = await chatSession.sendMessage(message);
          reply = result.response.text();
          
          // Post-process: dọn dẹp xuống dòng thừa (3+ newlines → 2)
          if (reply) {
            reply = reply.replace(/\n{3,}/g, '\n\n');
          }
          
          if (reply) {
            console.log(`=> Thành công: Model [${modelName}] - Key [${i+1}]`);
            break; 
          }
        } catch (err) {
          finalError = err;
          const isRateLimit = err.message.includes("429") || err.message.toLowerCase().includes("quota");
          
          if (isRateLimit) {
            console.warn(`[Model ${modelName}] Key ${i+1} hết hạn mức. Thử Key tiếp theo...`);
          } else {
            console.warn(`[Model ${modelName}] Key ${i+1} lỗi khác: ${err.message.split('\n')[0]}`);
          }
          // Lỗi thì vòng lặp trong sẽ tự nhảy sang Key tiếp theo
        }
      }

      if (reply) break; // Nếu đã có câu trả lời từ bất kỳ Key nào của Model hiện tại, thoát vòng lặp ngoài
      console.warn(`[!] Model ${modelName} thất bại trên toàn bộ Keys. Chuyển sang Model tiếp theo...`);
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