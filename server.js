require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
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
    message: "SafePak API is running 🚀"
  });
});

app.get("/nicholas", (req, res) => {
  res.send("NICHOLAS TEST");
});

app.get("/test", (req, res) => {
  res.send("TEST OK");
});

/* ================= DB (STEP 1 + STEP 2 FIX) ================= */

let db;

async function initDB() {
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log("✅ DB initialized successfully");
  } catch (err) {
    console.log("❌ DB init failed:", err.message);
  }
}

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
    const { employeeNumber, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber=?",
      [employeeNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const user = rows[0];

    if (user.employeeNumber === "001" && user.password !== password) {
      return res.status(401).json({ error: "Wrong password" });
    }

    await db.query(
      `UPDATE attendance
       SET logoutTime = NOW(),
       workedMinutes = TIMESTAMPDIFF(MINUTE, loginTime, NOW())
       WHERE employeeNumber = ?
       AND logoutTime IS NULL`,
      [user.employeeNumber]
    );

    await db.query(
      `INSERT INTO attendance
      (employeeNumber, fullName, role, loginTime, workedMinutes, shift)
      VALUES (?, ?, ?, NOW(), 0, ?)`,
      [user.employeeNumber, user.fullName, user.role, getShift()]
    );

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
       WHERE employeeNumber = ?
       AND logoutTime IS NULL`,
      [req.user.employeeNumber]
    );

    res.json({ message: "Logged out" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Logout failed" });
  }
});

/* ================= EMPLOYEES ================= */

app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const { employeeNumber, fullName, role } = req.body;

    await db.query(
      `INSERT INTO employees (employeeNumber, fullName, role)
       VALUES (?, ?, ?)`,
      [employeeNumber, fullName, role]
    );

    res.json({ message: "Employee saved" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Add employee failed" });
  }
});

app.put("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const { id } = req.params;
    const { fullName, role } = req.body;

    await db.query(
      `UPDATE employees SET fullName=?, role=? WHERE employeeNumber=?`,
      [fullName, role, id]
    );

    res.json({ message: "Employee updated" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    await db.query(
      "DELETE FROM employees WHERE employeeNumber=?",
      [req.params.id]
    );

    res.json({ message: "Employee deleted" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ================= ATTENDANCE ================= */

app.get("/api/attendance", verifyToken, async (req, res) => {
  try {
    let query = "SELECT * FROM attendance";
    let params = [];

    if (req.user.role !== "Admin") {
      query += " WHERE employeeNumber=?";
      params.push(req.user.employeeNumber);
    }

    query += " ORDER BY id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Attendance failed" });
  }
});

/* ================= SERVER START (STEP 3 FIX) ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 SafePak running on port ${PORT}`);

  // initialize DB AFTER server starts (prevents Railway timeout)
  await initDB();
});