require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS chuẩn (fix lỗi của bạn)
const allowedOrigins = [
  "http://localhost:5173",                // chạy local
  "https://chatbox-ai-eight.vercel.app"   // frontend deploy trên Vercel
];

app.use(
  cors({
    origin: function (origin, callback) {
      // cho phép request không có origin (Postman, mobile app...)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("❌ Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ✅ handle preflight (QUAN TRỌNG)
app.options("*", cors());

app.use(express.json());

// ✅ Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => {
    console.error("❌ Lỗi MongoDB:", err.message);
    process.exit(1);
  });

// ✅ Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend AI Chatbox đang chạy"
  });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});