import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!employeeNumber.trim()) {
      setMessage("Please enter your employee number");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Login failed");
        return;
      }

      // SUCCESS
      onLogin(data);
    } catch (err) {
      setMessage("Server not reachable");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Safepak System Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Employee Number"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
        />

        <br /><br />

        <button type="submit">Login</button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}
    </div>
  );
}