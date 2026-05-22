import React, { useState } from "react";

export default function EmployeeForm() {
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [role, setRole] = useState("Employee");
  const [shift, setShift] = useState("Day");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) return setMessage("Full name is required");
    if (employeeNumber.length < 3) return setMessage("Employee number must be at least 3 characters");

    try {
      const res = await fetch("http://localhost:3000/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, employeeNumber, role, shift }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);

      if (res.ok) {
        setFullName("");
        setEmployeeNumber("");
        setRole("Employee");
        setShift("Day");
      }
    } catch {
      setMessage("Server error");
    }
  };

  return (
    <div>
      <h2>Register Employee</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input placeholder="Employee Number" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Employee</option>
          <option>Manpower</option>
          <option>Cleaner</option>
          <option>Supervisor</option>
        </select>
        <select value={shift} onChange={(e) => setShift(e.target.value)}>
          <option>Day</option>
          <option>Night</option>
        </select>
        <button type="submit">Register</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}