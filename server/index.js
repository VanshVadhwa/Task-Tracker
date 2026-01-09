const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());

// FIXED CORS (Allow Vercel frontend)
app.use(cors({
  origin: "https://mern-task-tracker-xi.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
const SECRET_KEY = process.env.SECRET_KEY;

if (!MONGO_URI || !SECRET_KEY) {
  console.error("Missing environment variables (MONGO_URI or SECRET_KEY)");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// --- SCHEMAS & MODELS ---

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided" });

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified; // { id: "user_id_here" }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
};

// --- ROUTES: AUTHENTICATION ---

// Register
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username: user.username });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTES: TASKS (PROTECTED) ---

// Get all tasks
app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id });
    res.json(tasks);
  } catch (err) {
    console.error("FETCH TASKS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Add task
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const newTask = new Task({
      title: req.body.title,
      userId: req.user.id
    });

    await newTask.save();
    res.status(201).json(newTask);

  } catch (err) {
    console.error("ADD TASK ERROR:", err);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Toggle task
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.isCompleted = !task.isCompleted;
    await task.save();

    res.json(task);
  } catch (err) {
    console.error("UPDATE TASK ERROR:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ error: "Task not found" });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("DELETE TASK ERROR:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
