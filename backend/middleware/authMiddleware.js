const jwt = require("jsonwebtoken");

// Middleware xác thực JWT
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Chưa đăng nhập"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = {
      id: decoded.userId,
      username: decoded.username
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
      error: err.message
    });
  }
}

module.exports = requireAuth;

