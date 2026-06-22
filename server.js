// server.js - Backend API
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PdfReader } = require("pdf-parse");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/audio", express.static(path.join(__dirname, "audio")));

// Multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "./uploads";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}.pdf`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// In-memory task storage (use Redis/DB in production)
const tasks = new Map();

// ====== API ROUTES ======

// 1. Get available voices
app.get("/api/voices", (req, res) => {
  const voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  res.json({ voices });
});

// 2. Upload PDF and process
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const { voice } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const taskId = uuidv4();
    tasks.set(taskId, {
      status: "processing",
      voice,
      filePath: file.path,
      audioPath: null,
    });

    // Start processing asynchronously
    processPDF(taskId, file.path, voice);

    res.json({
      task_id: taskId,
      status: "processing",
      message: "PDF uploaded successfully. Processing started.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
});

// 3. Check task status
app.get("/api/status/:taskId", (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json({
    task_id: taskId,
    status: task.status,
    audio_url: task.audioPath ? `/audio/${task.audioPath}` : null,
  });
});

// 4. Download audio
app.get("/api/download/:taskId", (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (task.status !== "completed" || !task.audioPath) {
    return res.status(400).json({ error: "Audio not ready" });
  }

  const audioPath = path.join(__dirname, "audio", task.audioPath);
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: "Audio file not found" });
  }

  res.download(audioPath);
});

// ====== PROCESSING FUNCTION ======

async function processPDF(taskId, filePath, voice) {
  try {
    // Step 1: Extract text from PDF
    const pdfBuffer = fs.readFileSync(filePath);
    let text = "";

    try {
      // Try direct extraction first
      const pdf = await pdfParse(pdfBuffer);
      text = pdf.text;
    } catch (err) {
      console.log("Direct extraction failed, trying OCR...");
      // Fallback to OCR
      text = await extractTextWithOCR(filePath);
    }

    if (!text || text.trim().length < 20) {
      throw new Error("No text could be extracted from the PDF");
    }

    // Step 2: Generate audio using TTS service
    const audioPath = await generateAudio(text, voice, taskId);

    // Step 3: Update task status
    tasks.set(taskId, {
      status: "completed",
      voice,
      filePath,
      audioPath,
    });

    // Clean up uploaded file
    fs.unlink(filePath, () => {});
  } catch (error) {
    console.error("Processing error:", error);
    tasks.set(taskId, {
      status: "failed",
      error: error.message,
      filePath,
    });
  }
}

// ====== OCR FUNCTION ======

async function extractTextWithOCR(filePath) {
  const { data } = await Tesseract.recognize(filePath, "eng+rus+deu+spa+fra");
  return data.text;
}

// ====== TTS FUNCTION ======

async function generateAudio(text, voice, taskId) {
  // Use your preferred TTS service
  // For now, we'll use a placeholder
  const audioDir = path.join(__dirname, "audio");
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

  const audioFile = `${taskId}.wav`;
  const audioPath = path.join(audioDir, audioFile);

  // TODO: Implement actual TTS here (OpenAI, ElevenLabs, etc.)
  // For now, create a placeholder
  fs.writeFileSync(audioPath, "Placeholder audio content");

  return audioFile;
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
