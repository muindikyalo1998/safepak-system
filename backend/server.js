require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

/* ================= SECURITY ================= */
app.use(helmet());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* ================= LOGGING ================= */
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("Backend is working");
});

/* ================= DB ================= */
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_NAME =", process.env.DB_NAME);
console.log("DB_USER =", process.env.DB_USER);

let db;

async function initDB() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10
    });

    console.log("✅ Database connected successfully");
  } catch (err) {
    console.log("❌ Database connection failed:", err.message);
  }
}

initDB();

const SECRET = process.env.SECRET || "safepak_secret";

/* ================= RATE LIMIT ================= */
app.use("/api/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts. Try again later." }
}));

/* ================= AUTH ================= */
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) return res.status(401).json({ error: "No token provided" });

  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ================= LOGIN ================= */
app.post("/api/login", async (req, res) => {
  try {
    const { employeeNumber, password } = req.body;

    /* ADMIN LOGIN (fallback) */
    if (employeeNumber === "001" && password === "2000") {
      const token = jwt.sign(
        { employeeNumber: "001", role: "Admin" },
        SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        token,
        user: {
          employeeNumber: "001",
          role: "Admin",
          fullName: "Admin"
        }
      });
    }

    if (!db) return res.status(500).json({ error: "Database not ready" });

    const [rows] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber=?",
      [employeeNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { employeeNumber: user.employeeNumber, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= CREATE ADMIN (TEMP FIX) ================= */
app.get("/create-admin", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "DB not ready" });

    await db.query(`
      INSERT INTO employees (employeeNumber, fullName, role, password)
      VALUES ('001', 'Admin', 'Admin', '2000')
    `);

    res.json({ message: "Admin created successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= ATTENDANCE ================= */
app.get("/api/attendance", verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "DB not ready" });

    const [rows] = await db.query(
      "SELECT * FROM attendance ORDER BY id DESC"
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= LOGOUT ================= */
app.post("/api/logout", verifyToken, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

/* ================= ADD EMPLOYEE ================= */
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    if (!db) return res.status(500).json({ error: "DB not ready" });

    const { employeeNumber, fullName, role, password } = req.body;

    await db.query(
      `INSERT INTO employees (employeeNumber, fullName, role, password)
       VALUES (?, ?, ?, ?)`,
      [employeeNumber, fullName, role, password]
    );

    res.json({ message: "Employee added successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on Railway port", PORT);
});