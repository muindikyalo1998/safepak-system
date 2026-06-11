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

/* ================= LOGIN (FIXED) ================= */

app.post("/api/login", async (req, res) => {
  try {
    const { employeeNumber, password } = req.body;

    // 🔥 TEST ADMIN LOGIN
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

    // 🔥 DATABASE LOGIN
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

    res.json({ token, user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= ATTENDANCE (TEST DATA) ================= */

app.get("/api/attendance", verifyToken, async (req, res) => {
  try {
    res.json([
      {
        employeeNumber: "001",
        fullName: "Admin User",
        role: "Admin",
        shift: "Morning",
        loginTime: "08:00",
        logoutTime: "16:00",
        workedMinutes: 480,
        workedHours: 8
      },
      {
        employeeNumber: "EMP002",
        fullName: "Mary Wanjiku",
        role: "Supervisor",
        shift: "Afternoon",
        loginTime: "14:00",
        logoutTime: null,
        workedMinutes: 300,
        workedHours: 5
      },
      {
        employeeNumber: "EMP003",
        fullName: "Peter Otieno",
        role: "Security",
        shift: "Night",
        loginTime: "22:00",
        logoutTime: "06:00",
        workedMinutes: 480,
        workedHours: 8
      }
    ]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Attendance error" });
  }
});

/* ================= EMPLOYEES (UNCHANGED) ================= */

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