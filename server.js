const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET = "smartstudent_secret";

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ================= FILE STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// ================= SIMPLE USER DB =================
const USERS_FILE = "users.json";

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ================= AUTH =================

// SIGNUP
app.post("/api/signup", (req, res) => {
  const { email, password, name } = req.body;

  let users = getUsers();

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = { email, password, name };
  users.push(newUser);
  saveUsers(users);

  const token = jwt.sign({ email, name }, SECRET);

  res.json({
    token,
    user: { email, name }
  });
});

// LOGIN
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

  res.json({
    token,
    user: { email: user.email, name: user.name }
  });
});

// ================= ATTENDANCE (MATCH FRONTEND: photo) =================
app.post("/api/attendance", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  res.json({
    result: "📸 Attendance processed: 18 students detected (AI mock)"
  });
});

// ================= NOTES (MATCH FRONTEND: file) =================
app.post("/api/notes", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    result:
      "📝 Notes Summary:\n- Key concepts extracted\n- Important points highlighted\n- Revision ready notes generated (mock AI)"
  });
});

// ================= QUIZ GENERATOR =================
app.post("/api/quiz", (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic required" });
  }

  res.json({
    result: `
📘 Quiz on: ${topic}

1. What is ${topic}?
A) Option A
B) Option B
C) Option C
D) Option D

2. Explain ${topic} in short.

3. Write 2 examples of ${topic}.

🤖 Generated successfully
`
  });
});

// ================= DOUBT SOLVER =================
app.post("/api/doubt", (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  res.json({
    result: `
🤖 Answer:

Your Question: ${query}

Step 1: Understand concept
Step 2: Apply logic
Step 3: Final explanation

(This is AI mock response — can be upgraded to GPT later)
`
  });
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.json({ status: "OK", server: "SmartStudent AI Backend" });
});

// ================= FILE LIST =================
app.get("/api/files", (req, res) => {
  const files = fs.readdirSync("uploads").map(f => ({
    name: f,
    url: `/uploads/${f}`
  }));

  res.json({ files });
});

// ================= DELETE FILE =================
app.delete("/api/files/:name", (req, res) => {
  const filePath = path.join("uploads", req.params.name);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }

  res.status(404).json({ error: "File not found" });
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SmartStudent AI running on port ${PORT}`);
});
