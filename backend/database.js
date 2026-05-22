const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./safepak.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to Safepak SQLite database");
  }
});

// Employees
db.run(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_number TEXT UNIQUE,
    full_name TEXT,
    role TEXT,
    status TEXT DEFAULT 'active'
  )
`);

// Attendance
db.run(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_number TEXT,
    login_time TEXT,
    logout_time TEXT,
    shift TEXT,
    allocation TEXT
  )
`);

// Machines
db.run(`
  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_number TEXT UNIQUE,
    is_allocated INTEGER DEFAULT 0
  )
`);

// Godowns
db.run(`
  CREATE TABLE IF NOT EXISTS godowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    godown_name TEXT UNIQUE,
    is_allocated INTEGER DEFAULT 0
  )
`);

module.exports = db;