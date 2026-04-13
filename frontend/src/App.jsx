import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const CHAT_API_URL = "https://chatbox-ai-backend-quov.onrender.com/api/chat";
const AUTH_API_URL = "https://chatbox-ai-backend-quov.onrender.com/api/auth";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [authUser, setAuthUser] = useState(null); // { username }
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const sendMessage = async () => {
    if (!token) return;
    if (!message.trim()) return;

    const userMessage = { role: "user", text: message };
    const updatedChat = [...chat, userMessage];

    setChat(updatedChat);
    setLoading(true);

    try {
      const res = await axios.post(
        CHAT_API_URL,
        { message, history: chat },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: "model",
        text: res.data.reply
      };

      setChat([...updatedChat, aiMessage]);
      setMessage("");
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
        setToken(null);
        setAuthUser(null);
        setAuthModal(null);
      }
      setChat([
        ...updatedChat,
        {
          role: "model",
          text: "Có lỗi xảy ra khi gọi AI."
        }
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${CHAT_API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const historyData = res.data.data || [];

      const merged = [];
      historyData.forEach((item) => {
        merged.push({ role: "user", text: item.userMessage });
        merged.push({ role: "model", text: item.aiMessage });
      });

      setChat(merged);
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
        setToken(null);
        setAuthUser(null);
      }
      console.error("Lỗi tải lịch sử:", error);
    }
  };

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("auth_user");
      if (rawUser) setAuthUser(JSON.parse(rawUser));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadHistory();
    } else {
      setChat([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const openAuth = (mode) => {
    setAuthModal(mode);
    setAuthError("");
    setAuthSuccess("");
    setAuthUsername("");
    setAuthPassword("");
    setAuthConfirmPassword("");
  };

  const handleRegister = () => {
    setAuthError("");
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError("Mật khẩu xác nhận không khớp.");
      return;
    }

    axios
      .post(`${AUTH_API_URL}/register`, {
        username: authUsername.trim(),
        password: authPassword
      })
      .then((res) => {
        setAuthSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
        setAuthError("");
        setAuthModal("login");
        setAuthUsername("");
        setAuthPassword("");
        setAuthConfirmPassword("");
      })
      .catch((err) => {
        setAuthError(err?.response?.data?.message || "Đăng ký thất bại");
      });
  };

  const handleLogin = () => {
    setAuthError("");
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    axios
      .post(`${AUTH_API_URL}/login`, {
        username: authUsername.trim(),
        password: authPassword
      })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("auth_user", JSON.stringify(res.data.user));
        setToken(res.data.token);
        setAuthUser(res.data.user);
        setAuthModal(null);
      })
      .catch((err) => {
        setAuthError(err?.response?.data?.message || "Đăng nhập thất bại");
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setAuthUser(null);
    setAuthModal(null);
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="top-bar">
          <div className="title">
            <h1>🤖 Chatbox AI </h1>
            <p className="sub"></p>
          </div>

          <div className="auth-actions">
            {authUser ? (
              <>
                <span className="auth-user">Xin chào, {authUser.username}</span>
                <button className="link-button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button className="auth-button" onClick={() => openAuth("login")}>
                  Đăng nhập
                </button>
                <button className="auth-button secondary" onClick={() => openAuth("register")}>
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>

        <div className="chat-box">
          {!token ? (
            <div className="empty">Vui lòng đăng nhập để bắt đầu chat</div>
          ) : chat.length === 0 ? (
            <div className="empty">Chưa có tin nhắn nào</div>
          ) : (
            chat.map((item, index) => (
              <div
                key={index}
                className={`message ${item.role === "user" ? "user" : "ai"}`}
              >
                <strong>{item.role === "user" ? "Bạn" : "AI"}:</strong>
                <div className="md-content"><ReactMarkdown>{item.text}</ReactMarkdown></div>
              </div>
            ))
          )}

          {loading && token && (
            <div className="message ai">
              <strong>AI:</strong>
              <span>Đang trả lời...</span>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder="Nhập câu hỏi..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!token}
          />
          <button onClick={sendMessage} disabled={!token || loading}>
            Gửi
          </button>
        </div>

        {authModal && (
          <div
            className="modal-overlay"
            onMouseDown={(e) => {
              // click ra ngoài modal để đóng
              if (e.target === e.currentTarget) setAuthModal(null);
            }}
          >
            <div className="modal-card" role="dialog" aria-modal="true">
              <h2 className="modal-title">
                {authModal === "login" ? "Đăng nhập" : "Đăng ký"}
              </h2>
              {authSuccess && <div className="auth-success">{authSuccess}</div>}
              {authError && <div className="auth-error">{authError}</div>}

              <div className="form-row">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Ví dụ: anhtu"
                  autoComplete="username"
                />
              </div>

              <div className="form-row">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete={authModal === "login" ? "current-password" : "new-password"}
                />
              </div>

              {authModal === "register" && (
                <div className="form-row">
                  <label>Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setAuthModal(null)}>
                  Hủy
                </button>
                {authModal === "login" ? (
                  <button className="primary-btn" onClick={handleLogin}>
                    Đăng nhập
                  </button>
                ) : (
                  <button className="primary-btn" onClick={handleRegister}>
                    Tạo tài khoản
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}