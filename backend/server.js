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
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_NAME =", process.env.DB_NAME);
console.log("DB_USER =", process.env.DB_USER);
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const SECRET = process.env.SECRET || "safepak_secret";

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

    if (employeeNumber === "001" && password === "2000") {
      const token = jwt.sign(
        { employeeNumber: "001", role: "Admin" },
        SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        token,
        user: { employeeNumber: "001", role: "Admin", fullName: "Admin" }
      });
    }

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
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= ADD EMPLOYEE (FIXED) ================= */
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const { employeeNumber, fullName, role, password } = req.body;

    // 🔥 FIX: prevent 500 crash
    if (!employeeNumber || !fullName || !role || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const sql = `
      INSERT INTO employees (employeeNumber, fullName, role, password)
      VALUES (?, ?, ?, ?)
    `;

    await db.query(sql, [
      employeeNumber,
      fullName,
      role,
      password
    ]);

    res.json({ message: "Employee added successfully" });

  } catch (err) {
    console.log("EMPLOYEE ERROR:", err);
    res.status(500).json({
      error: err.sqlMessage || err.message
    });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});