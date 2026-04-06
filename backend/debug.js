require("dotenv").config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log("AVAILABLE MODELS:", data.models?.map(m => m.name).filter(n => n.includes("flash") || n.includes("pro")));
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log("--- Testing gemini-2.5-flash ---");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const chatSession = model.startChat({ history: [] });
      const result = await chatSession.sendMessage("hello");
      console.log("2.5 SUCCESS:", result.response.text());
    } catch(e) {
      console.error("2.5 ERROR:", e.message);
    }
    try {
      const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chatSession2 = model2.startChat({ history: [] });
      const result2 = await chatSession2.sendMessage("hello");
      console.log("1.5 SUCCESS:", result2.response.text());
    } catch(e) {
      console.error("1.5 ERROR:", e.message);
    }

  } catch(e) {
    console.log("FATAL ERROR:", e.message);
  }
}
test();
