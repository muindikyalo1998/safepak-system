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
app.use(cors());
app.use(express.json());

/* ================= DB ================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const SECRET = process.env.SECRET || "safepak_secret";

/* ================= RATE LIMIT ================= */
app.use("/api/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts. Try again later." }
}));

/* ================= LOGGING ================= */
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

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

/* ================= SHIFT ================= */
function getShift() {
  const h = new Date().getHours();

  if (h >= 6 && h < 14) return "Morning";
  if (h >= 14 && h < 22) return "Afternoon";
  return "Night";
}

/* ================= LOGIN ================= */
app.post("/api/login", async (req, res) => {
  try {
    const { employeeNumber, password } = req.body;

    console.log("LOGIN BODY:", req.body);

    /* ---------- ADMIN LOGIN ---------- */
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

    /* ---------- FIND EMPLOYEE ---------- */
    const [rows] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber=?",
      [employeeNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const user = rows[0];

    /* ---------- SIMPLE PASSWORD CHECK (NO BCRYPT) ---------- */
    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* ---------- TOKEN ---------- */
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
  try {
    await db.query(
      `UPDATE attendance
       SET logoutTime = NOW(),
           workedMinutes = TIMESTAMPDIFF(MINUTE, loginTime, NOW())
       WHERE employeeNumber=? AND logoutTime IS NULL`,
      [req.user.employeeNumber]
    );

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

/* ================= ATTENDANCE ================= */
app.get("/api/attendance", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM attendance ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Attendance error" });
  }
});

/* ================= ADD EMPLOYEE (NO BCRYPT) ================= */
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const { employeeNumber, fullName, role, password } = req.body;

    await db.query(
      `INSERT INTO employees (employeeNumber, fullName, role, password)
       VALUES (?, ?, ?, ?)`,
      [employeeNumber, fullName, role, password]
    );

    res.json({ message: "Employee added successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to add employee" });
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafePak running on port ${PORT}`);
});