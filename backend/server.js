require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express(); 
app.set("trust proxy", 1);

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

/* FIXED DB INIT */
async function initDB() {
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10
    });

    console.log("✅ Database connected successfully");
  } catch (err) {
    console.log("❌ DB connection failed:", err.message);
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

  if (!auth) {
    return res.status(401).json({ error: "No token provided" });
  }

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
    console.log("LOGIN ATTEMPT");
console.log("employeeNumber =", employeeNumber);
console.log("password =", password);

    /* ADMIN FALLBACK */
    if (employeeNumber === "001" && password === "2000") {

  await db.query(
    `INSERT INTO attendance
    (id, employeeNumber, fullName, role, loginTime)
    VALUES (?, ?, ?, ?, NOW())`,
    [
      Date.now().toString(),
      "001",
      "Admin",
      "Admin"
    ]
  );

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
    if (!db) {
      return res.status(500).json({ error: "Database not ready" });
    }

    const [rows] = await db.query(
  "SELECT * FROM employees WHERE employeeNumber=?",
  [employeeNumber]
);

console.log("Employees found:", rows.length);
console.log(rows);

if (!rows.length) {
  return res.status(404).json({ error: "Employee not found" });
}
    const user = rows[0];
await db.query(
  `INSERT INTO attendance
  (id, employeeNumber, fullName, role, loginTime)
  VALUES (?, ?, ?, ?, NOW())`,
  [
    Date.now().toString(),
    user.employeeNumber,
    user.fullName,
    user.role
  ]
);
    if (password !== user.password) {
      console.log("DB password =", user.password);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { employeeNumber: user.employeeNumber, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ================= CREATE ADMIN (FIXED + SAFE) ================= */
app.get("/create-admin", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    // check if admin exists
    const [existing] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber = ?",
      ["001"]
    );

    if (existing.length > 0) {
      return res.json({ message: "Admin already exists" });
    }

    await db.query(
      "INSERT INTO employees (employeeNumber, fullName, role, password) VALUES (?, ?, ?, ?)",
      ["001", "Admin", "Admin", "2000"]
    );

    res.json({ message: "Admin created successfully" });

  } catch (err) {
    console.log("ADMIN ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ================= ATTENDANCE ================= */
app.get("/api/attendance", verifyToken, async (req, res) => {
  try {

    let rows;

    if (req.user.role === "Admin") {

  console.log("ADMIN VIEW:", req.user.employeeNumber);

  [rows] = await db.query(
    "SELECT * FROM attendance ORDER BY loginTime DESC"
  );

} else {

  console.log("EMPLOYEE VIEW:", req.user.employeeNumber);

  [rows] = await db.query(
    "SELECT * FROM attendance WHERE employeeNumber = ? ORDER BY loginTime DESC",
    [req.user.employeeNumber]
  );

}

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ================= LOGOUT ================= */
app.post("/api/logout", verifyToken, async (req, res) => {
  try {

    await db.query(
      `UPDATE attendance
       SET logoutTime = NOW()
       WHERE employeeNumber = ?
       AND logoutTime IS NULL`,
      [req.user.employeeNumber]
    );

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    console.log("LOGOUT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});
/* ================= ADD EMPLOYEE ================= */
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const { employeeNumber, fullName, role, password } = req.body;

    if (!employeeNumber || !fullName || !role || !password) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    const [existing] = await db.query(
      "SELECT * FROM employees WHERE employeeNumber = ?",
      [employeeNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Employee number already exists"
      });
    }

    const [next] = await db.query(
      "SELECT COALESCE(MAX(id),0)+1 AS nextId FROM employees"
    );

    await db.query(
      `INSERT INTO employees
      (id, employeeNumber, fullName, role, password)
      VALUES (?, ?, ?, ?, ?)`,
      [
        next[0].nextId,
        employeeNumber,
        fullName,
        role,
        password
      ]
    );

    res.json({
      message: "Employee added successfully"
    });

  } catch (err) {
    console.log("EMPLOYEE ERROR:", err.message);

    res.status(500).json({
      error: err.message
    });
  }
});
/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on Railway port", PORT);
});