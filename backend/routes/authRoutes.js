const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username
    },
    process.env.AUTH_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !username.trim() || !password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"
      });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập phải có ít nhất 3 ký tự"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      });
    }

    const existed = await User.findOne({ username: cleanUsername });
    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại"
      });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      username: cleanUsername,
      passwordHash
    });

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đăng ký",
      error: error.message
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !username.trim() || !password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"
      });
    }

    const cleanUsername = username.trim();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Sai tên đăng nhập hoặc mật khẩu"
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Sai tên đăng nhập hoặc mật khẩu"
      });
    }

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đăng nhập",
      error: error.message
    });
  }
});

module.exports = router;

