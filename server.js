require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

/* ================= HEALTH ROUTES ================= */

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "SafePak API is running 🚀 (DEBUG MODE - NO DB)"
  });
});

app.get("/nicholas", (req, res) => {
  res.send("NICHOLAS TEST");
});

app.get("/test", (req, res) => {
  res.send("TEST OK");
});

/* ================= TEMP DB (IMPORTANT DEBUG FIX) ================= */

const db = {
  query: async () => {
    return [[], []];
  }
};

/* ================= SECRET ================= */

const SECRET = process.env.SECRET || "safepak_secret";

/* ================= SHIFT ================= */

function getShift() {
  const h = new Date().getHours();

  if (h >= 6 && h < 14) return "Morning";
  if (h >= 14 && h < 22) return "Afternoon";
  return "Night";
}

/* ================= AUTH ================= */

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  try {
    const { employeeNumber } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber=?",
      [employeeNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Employee not found (mock DB)" });
    }

    const user = rows[0] || {
      employeeNumber,
      fullName: "Test User",
      role: "Admin"
    };

    const token = jwt.sign(
      { employeeNumber: user.employeeNumber, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= LOGOUT ================= */

app.post("/api/logout", verifyToken, async (req, res) => {
  res.json({ message: "Logged out (mock DB)" });
});

/* ================= EMPLOYEES ================= */

app.post("/api/employees", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee saved (mock DB)" });
});

app.put("/api/employees/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee updated (mock DB)" });
});

app.delete("/api/employees/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee deleted (mock DB)" });
});

/* ================= ATTENDANCE ================= */

app.get("/api/attendance", verifyToken, async (req, res) => {
  res.json([]);
});

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafePak running on port ${PORT} (DEBUG MODE)`);
});