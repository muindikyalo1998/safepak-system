// db.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",      // your MySQL username
  password: "",      // your MySQL password
  database: "safepak" // your database name
});

module.exports = pool.promise();