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

/* ================= DB ================= */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

/* ================= SECRET ================= */

const SECRET = process.env.SECRET || "safepak_secret";

/* ================= AUTH ================= */

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });

  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
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

/* ================= CHECK ACTIVE LOGIN ================= */

async function isAlreadyLoggedIn(employeeNumber) {
  const [rows] = await db.query(
    "SELECT * FROM attendance WHERE employeeNumber=? AND logoutTime IS NULL",
    [employeeNumber]
  );
  return rows.length > 0;
}

/* ================= MACHINE / GODOWN ALLOCATION ================= */

async function assignMachine() {
  const [rows] = await db.query(
    "SELECT machineNumber FROM attendance WHERE logoutTime IS NULL AND machineNumber IS NOT NULL"
  );

  const used = rows.map(r => r.machineNumber);

  for (let i = 1; i <= 130; i++) {
    if (!used.includes(i)) return i;
  }

  return null;
}

async function assignGodown() {
  const [rows] = await db.query(
    "SELECT godownNumber FROM attendance WHERE logoutTime IS NULL AND godownNumber IS NOT NULL"
  );

  const used = rows.map(r => r.godownNumber);

  for (let i = 1; i <= 13; i++) {
    if (!used.includes(i)) return i;
  }

  return null;
}

/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  try {
    const { employeeNumber, password } = req.body;

    /* ---------- ADMIN LOGIN ---------- */
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

    /* ---------- EMPLOYEE LOGIN ---------- */
    const [rows] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber=?",
      [employeeNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const user = rows[0];

    /* ---------- BLOCK DOUBLE LOGIN ---------- */
    const active = await isAlreadyLoggedIn(employeeNumber);

    if (active) {
      return res.status(400).json({
        error: "Already logged in. Please logout first."
      });
    }

    /* ---------- ASSIGN RESOURCES ---------- */
    let machineNumber = null;
    let godownNumber = null;

    if (user.role === "Employee") {
      machineNumber = await assignMachine();
      if (!machineNumber) {
        return res.status(400).json({ error: "No machines available" });
      }
    }

    if (user.role === "Cleaner" || user.role === "Supervisor") {
      godownNumber = await assignGodown();
      if (!godownNumber) {
        return res.status(400).json({ error: "No godowns available" });
      }
    }

    /* ---------- INSERT ATTENDANCE ---------- */
    await db.query(
      `INSERT INTO attendance
      (employeeNumber, fullName, role, loginTime, shift, attendanceDate, machineNumber, godownNumber, workedMinutes)
      VALUES (?, ?, ?, NOW(), ?, CURDATE(), ?, ?, 0)`,
      [
        user.employeeNumber,
        user.fullName,
        user.role,
        getShift(),
        machineNumber,
        godownNumber
      ]
    );

    const token = jwt.sign(
      { employeeNumber: user.employeeNumber, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user, machineNumber, godownNumber });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= LOGOUT ================= */

app.post("/api/logout", verifyToken, async (req, res) => {
  try {
    const employeeNumber = req.user.employeeNumber;

    await db.query(
      `UPDATE attendance
       SET logoutTime = NOW(),
           workedMinutes = TIMESTAMPDIFF(MINUTE, loginTime, NOW())
       WHERE employeeNumber=? AND logoutTime IS NULL`,
      [employeeNumber]
    );

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    console.log(err);
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

/* ================= ADMIN ADD EMPLOYEE ================= */

app.post("/api/employees", verifyToken, async (req, res) => {
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
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafePak running on port ${PORT}`);
});