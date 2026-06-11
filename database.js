const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
  path.resolve(__dirname, "safepak.db"),
  (err) => {
    if (err) {
      console.error("❌ Failed to connect to SQLite database:", err.message);
    } else {
      console.log("✅ Connected to Safepak SQLite database");
    }
  }
);

module.exports = db;