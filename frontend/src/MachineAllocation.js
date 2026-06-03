import React, { useState, useEffect } from "react";

export default function MachineAllocation() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [machineNumber, setMachineNumber] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data));
  }, []);

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return setMessage("Select an employee");
    if (!machineNumber.trim()) return setMessage("Enter a machine number");

    try {
      const res = await fetch(`http://localhost:3000/api/employees/${selectedEmp}/machine`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineNumber }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      setMachineNumber("");
    } catch {
      setMessage("Server error");
    }
  };

  return (
    <div>
      <h2>Allocate Machine</h2>
      <form onSubmit={handleAllocate}>
        <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} required>
          <option value="">Select Employee</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.employeeNumber}>
              {emp.fullName} ({emp.role})
            </option>
          ))}
        </select>
        <input placeholder="Machine Number" value={machineNumber} onChange={(e) => setMachineNumber(e.target.value)} required />
        <button type="submit">Allocate</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}