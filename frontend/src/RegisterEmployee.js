import React, { useState } from "react";

export default function RegisterEmployee() {
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [role, setRole] = useState("Employee");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!fullName || !employeeNumber || !role) {
      setMessage("All fields are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, employeeNumber, role }),
      });

      const data = await res.json();

      if (!res.ok && data.error) {
        setMessage(data.error);
        return;
      }

      setMessage("Employee registered successfully!");
      setFullName("");
      setEmployeeNumber("");
      setRole("Employee");
    } catch (err) {
      setMessage("Server not reachable");
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Register Employee</h3>

      <form onSubmit={handleRegister}>
        <input
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Employee Number"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
        />
        <br /><br />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="Employee">Employee</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Cleaner">Cleaner</option>
        </select>
        <br /><br />

        <button type="submit">Register</button>
      </form>

      {message && <p style={{ color: "green" }}>{message}</p>}
    </div>
  );
}