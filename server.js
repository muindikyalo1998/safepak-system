require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.url);
  next();
});
app.get("/", (req, res) => {
  res.send("SafePak API is running 🚀");
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

/* ================= SHIFT ================= */

function getShift() {

  const h = new Date().getHours();

  if (h >= 6 && h < 14) return "Morning";

  if (h >= 14 && h < 22) return "Afternoon";

  return "Night";
}

/* ================= TOKEN ================= */

function verifyToken(req, res, next) {

  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({
      error: "No token"
    });
  }

  try {

    const token = auth.split(" ")[1];

    req.user = jwt.verify(token, SECRET);

    next();

  } catch {

    return res.status(401).json({
      error: "Invalid token"
    });
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

      return res.status(404).json({
        error: "Employee not found"
      });
    }

    const user = rows[0];

    /* ADMIN PASSWORD ONLY */

    if (
      user.employeeNumber === "001" &&
      user.password !== password
    ) {

      return res.status(401).json({
        error: "Wrong password"
      });
    }

    /* CLOSE ACTIVE SESSION */

    await db.query(
      `UPDATE attendance
       SET logoutTime = NOW(),
       workedMinutes = TIMESTAMPDIFF(MINUTE, loginTime, NOW())
       WHERE employeeNumber = ?
       AND logoutTime IS NULL`,
      [user.employeeNumber]
    );

    /* INSERT ATTENDANCE */

    await db.query(
      `INSERT INTO attendance
      (
        employeeNumber,
        fullName,
        role,
        loginTime,
        workedMinutes,
        shift
      )
      VALUES (?, ?, ?, NOW(), 0, ?)`,
      [
        user.employeeNumber,
        user.fullName,
        user.role,
        getShift()
      ]
    );

    /* TOKEN */

    const token = jwt.sign(
      {
        employeeNumber: user.employeeNumber,
        role: user.role
      },
      SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      token,
      user
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Login failed"
    });
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

    res.json({
      message: "Logged out"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Logout failed"
    });
  }
});

/* ================= ADD EMPLOYEE ================= */

app.post("/api/employees", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {

      return res.status(403).json({
        error: "Admin only"
      });
    }

    const {
      employeeNumber,
      fullName,
      role
    } = req.body;

    await db.query(
      `INSERT INTO employees
      (employeeNumber, fullName, role)
      VALUES (?, ?, ?)`,
      [
        employeeNumber,
        fullName,
        role
      ]
    );

    res.json({
      message: "Employee saved"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Add employee failed"
    });
  }
});

/* ================= UPDATE EMPLOYEE ================= */

app.put("/api/employees/:id", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {

      return res.status(403).json({
        error: "Admin only"
      });
    }

    const { id } = req.params;

    const {
      fullName,
      role
    } = req.body;

    await db.query(
      `UPDATE employees
       SET fullName = ?, role = ?
       WHERE employeeNumber = ?`,
      [
        fullName,
        role,
        id
      ]
    );

    res.json({
      message: "Employee updated"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Update failed"
    });
  }
});

/* ================= DELETE EMPLOYEE ================= */

app.delete("/api/employees/:id", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {

      return res.status(403).json({
        error: "Admin only"
      });
    }

    await db.query(
      "DELETE FROM employees WHERE employeeNumber=?",
      [req.params.id]
    );

    res.json({
      message: "Employee deleted"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Delete failed"
    });
  }
});

/* ================= ATTENDANCE ================= */

app.get("/api/attendance", verifyToken, async (req, res) => {

  try {

    let query = `
      SELECT * FROM attendance
    `;

    let params = [];

    if (req.user.role !== "Admin") {

      query += `
        WHERE employeeNumber = ?
      `;

      params.push(req.user.employeeNumber);
    }

    query += `
      ORDER BY id DESC
    `;

    const [rows] = await db.query(query, params);

    res.json(rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Attendance failed"
    });
  }
});

/* ================= SALARY SUMMARY ================= */

app.get("/api/salary-summary", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {
      return res.json([]);
    }

    const [rows] = await db.query(`
      SELECT
        employeeNumber,
        MAX(fullName) AS fullName,
        MAX(role) AS role,
        ROUND(SUM(workedMinutes) / 60, 2) AS totalHours,
        ROUND((SUM(workedMinutes) / 60) * 100, 2) AS salary
      FROM attendance
      GROUP BY employeeNumber
      ORDER BY employeeNumber ASC
    `);

    res.json(rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Salary summary failed"
    });
  }
});

/* ================= MONTHLY REPORT ================= */

app.get("/api/salary-monthly", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {
      return res.json([]);
    }

    const { month, year } = req.query;

    const [rows] = await db.query(
      `
      SELECT
        employeeNumber,
        MAX(fullName) AS fullName,
        MAX(role) AS role,
        ROUND(SUM(workedMinutes)/60,2) AS totalHours,
        ROUND((SUM(workedMinutes)/60)*100,2) AS salary
      FROM attendance
      WHERE MONTH(loginTime)=?
      AND YEAR(loginTime)=?
      GROUP BY employeeNumber
      ORDER BY employeeNumber ASC
      `,
      [month, year]
    );

    res.json(rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Monthly report failed"
    });
  }
});

/* ================= PAYSLIP ================= */

app.get("/api/payslip/:id", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Admin") {

      return res.status(403).json({
        error: "Admin only"
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        employeeNumber,
        MAX(fullName) AS fullName,
        MAX(role) AS role,
        ROUND(SUM(workedMinutes)/60,2) AS hours,
        ROUND((SUM(workedMinutes)/60)*100,2) AS salary
      FROM attendance
      WHERE employeeNumber=?
      GROUP BY employeeNumber
      `,
      [req.params.id]
    );

    if (!rows.length) {

      return res.status(404).json({
        error: "No payslip data"
      });
    }

    const data = rows[0];

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${req.params.id}-payslip.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text(
      "SAFEPAK PAYSLIP",
      {
        align: "center"
      }
    );

    doc.moveDown();

    doc.fontSize(12).text(
      `Employee No: ${data.employeeNumber}`
    );

    doc.text(
      `Name: ${data.fullName}`
    );

    doc.text(
      `Role: ${data.role}`
    );

    doc.text(
      `Hours Worked: ${data.hours}`
    );

    doc.text(
      `Salary: KSh ${data.salary}`
    );

    doc.end();

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Payslip failed"
    });
  }
});

/* ================= START ================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 SAFEPAK SERVER RUNNING ON PORT", PORT);
});