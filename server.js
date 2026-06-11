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

/* ================= SHIFT ================= */

function getShift() {
  const h = new Date().getHours();

  if (h >= 6 && h < 14) return "Morning";
  if (h >= 14 && h < 22) return "Afternoon";
  return "Night";
}

/* ================= ALLOCATION FUNCTION ================= */

function assignResources(role) {
  let machineNumber = null;
  let godownNumber = null;

  if (role === "Admin") {
    return { machineNumber: null, godownNumber: null };
  }

  // Employees → ONLY machine
  if (role === "Employee") {
    machineNumber = Math.floor(Math.random() * 130) + 1;
    return { machineNumber, godownNumber: null };
  }

  // Cleaners + Supervisors → ONLY godown
  if (role === "Cleaner" || role === "Supervisor") {
    godownNumber = Math.floor(Math.random() * 13) + 1;
    return { machineNumber: null, godownNumber };
  }

  return { machineNumber: null, godownNumber: null };
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
        user: {
          employeeNumber: "001",
          fullName: "Admin User",
          role: "Admin"
        }
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

    const token = jwt.sign(
      {
        employeeNumber: user.employeeNumber,
        role: user.role
      },
      SECRET,
      { expiresIn: "1d" }
    );

    /* ---------- ASSIGN MACHINE / GODOWN ---------- */
    const { machineNumber, godownNumber } = assignResources(user.role);

    /* ---------- INSERT ATTENDANCE ---------- */
    await db.query(`
      INSERT INTO attendance
      (employeeNumber, fullName, role, loginTime, shift, attendanceDate, machineNumber, godownNumber, workedMinutes)
      VALUES (?, ?, ?, NOW(), ?, CURDATE(), ?, ?, 0)
    `, [
      user.employeeNumber,
      user.fullName,
      user.role,
      getShift(),
      machineNumber,
      godownNumber
    ]);

    res.json({ token, user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= ATTENDANCE (REAL DB VERSION) ================= */

app.get("/api/attendance", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM attendance
      ORDER BY id DESC
    `);

    const result = rows.map(r => ({
      ...r,
      workedHours: r.workedMinutes ? Math.round(r.workedMinutes / 60) : 0
    }));

    res.json(result);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Attendance error" });
  }
});

/* ================= EMPLOYEES ================= */

app.post("/api/employees", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee saved" });
});

app.put("/api/employees/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee updated" });
});

app.delete("/api/employees/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  res.json({ message: "Employee deleted" });
});

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafePak running on port ${PORT}`);
});