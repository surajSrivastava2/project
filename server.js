const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= OPENAI SETUP =================
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// ================= USERS DB =================
const USERS_FILE = "users.json";

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ================= JWT =================
const SECRET = "smartstudent_secret";

// ================= AUTH =================
app.post("/api/signup", (req, res) => {
  const { email, password, name } = req.body;

  let users = getUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User exists" });
  }

  users.push({ email, password, name });
  saveUsers(users);

  const token = jwt.sign({ email, name }, SECRET);

  res.json({ token, user: { email, name } });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const users = getUsers();
  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ email: user.email, name: user.name }, SECRET);

  res.json({ token, user: { email: user.email, name: user.name } });
});

// ================= REAL AI FUNCTION =================
async function askAI(prompt) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are SmartStudent AI, a helpful academic tutor for students."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return response.choices[0].message.content;
}

// ================= CHAT AI =================
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await askAI(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DOUBT SOLVER =================
app.post("/api/doubt", async (req, res) => {
  try {
    const { query } = req.body;
    const result = await askAI(
      `Explain this doubt in simple steps for a student: ${query}`
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NOTES SUMMARIZER =================
app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const result = await askAI(
      "Summarize study notes in simple bullet points for revision"
    );

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= QUIZ GENERATOR =================
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic } = req.body;

    const result = await askAI(
      `Create a 5 question MCQ quiz on topic: ${topic}`
    );

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ATTENDANCE =================
app.post("/api/attendance", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  res.json({
    result: "Attendance processed using AI vision (mock logic placeholder)"
  });
});

// ================= FILES =================
app.get("/api/files", (req, res) => {
  const files = fs.readdirSync("uploads").map(f => ({
    name: f,
    url: `/uploads/${f}`
  }));

  res.json({ files });
});

app.delete("/api/files/:name", (req, res) => {
  const filePath = path.join("uploads", req.params.name);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }

  res.status(404).json({ error: "Not found" });
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.json({ status: "OK", ai: "ChatGPT enabled" });
});

// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SmartStudent AI running on port ${PORT}`);
});
