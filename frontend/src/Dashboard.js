import React, { useState, useEffect } from "react";
import RegisterEmployee from "./RegisterEmployee";

export default function Dashboard({ user }) {
  const [view, setView] = useState("employeeList");
  const [employees, setEmployees] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [roleFilter, setRoleFilter] = useState("All");
  const [empNumberFilter, setEmpNumberFilter] = useState("");

  // Fetch employees for Admin and Supervisor
  const fetchEmployees = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  useEffect(() => {
    if (user.role === "Admin" || user.role === "Supervisor") {
      fetchEmployees();
    }
  }, [user.role, refresh]);

  // DELETE EMPLOYEE (Admin only)
  const deleteEmployee = async (employeeNumber) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?"
    );
    if (!confirmDelete) return;

    try {
      await fetch(`http://localhost:5000/api/employees/${employeeNumber}`, {
        method: "DELETE",
      });
      setRefresh(!refresh);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("https://safepak-system.onrender.com/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber: user.employeeNumber }),
      });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Safepak Company System Dashboard</h1>
      <p>
        Welcome, <b>{user.fullName}</b> ({user.role}){" "}
        <button onClick={handleLogout}>Logout</button>
      </p>

      {/* Admin Menu */}
      {user.role === "Admin" && (
        <div style={{ marginBottom: "20px" }}>
          <button onClick={() => setView("registerEmployee")}>
            Register Employee
          </button>
          <button onClick={() => setView("employeeList")}>Employee List</button>
        </div>
      )}

      {/* Register Employee Form */}
      {view === "registerEmployee" && user.role === "Admin" && (
        <RegisterEmployee
          user={user}
          onRegistered={() => {
            setView("employeeList");
            setRefresh(!refresh);
          }}
        />
      )}

      {/* Employee List for Admin & Supervisor */}
      {view === "employeeList" &&
        (user.role === "Admin" || user.role === "Supervisor") && (
          <div>
            <div style={{ marginBottom: "10px" }}>
              <h2>
                {user.role === "Admin" ? "Employee List" : "Employee Dashboard"}
              </h2>

              <label>
                Filter by Role:{" "}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: "5px", marginRight: "15px" }}
                >
                  <option value="All">All</option>
                  <option value="Admin">Admin</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Employee">Employee</option>
                  <option value="Cleaner">Cleaner</option>
                </select>
              </label>

              <label>
                Filter by Employee Number:{" "}
                <input
                  type="text"
                  placeholder="e.g. EMP003"
                  value={empNumberFilter}
                  onChange={(e) => setEmpNumberFilter(e.target.value)}
                  style={{ padding: "5px" }}
                />
              </label>
            </div>

            {employees.length === 0 ? (
              <p>No employees registered yet.</p>
            ) : (
              <table border="1" cellPadding="5">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Employee Number</th>
                    <th>Role</th>
                    <th>Shift</th>
                    <th>Machine Number</th>
                    <th>Godown Number</th>
                    <th>Last Login</th>
                    <th>Last Logout</th>
                    {user.role === "Admin" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(
                      (e) =>
                        (roleFilter === "All" || e.role === roleFilter) &&
                        (empNumberFilter === "" ||
                          e.employeeNumber.includes(empNumberFilter))
                    )
                    .map((e) => {
                      const isCurrentUser = e.employeeNumber === user.employeeNumber;

                      // Row color by role
                      let rowColor = "white";
                      if (isCurrentUser) rowColor = "yellow";
                      else if (e.role === "Supervisor") rowColor = "#cce5ff";
                      else if (e.role === "Employee") rowColor = "#d4edda";
                      else if (e.role === "Cleaner") rowColor = "#f2f2f2";

                      return (
                        <tr
                          key={e.employeeNumber}
                          style={{ backgroundColor: rowColor }}
                        >
                          <td>{e.fullName}</td>
                          <td>{e.employeeNumber}</td>
                          <td>{e.role}</td>
                          <td>{e.shift || "-"}</td>
                          <td>{e.machineNumber || "-"}</td>
                          <td>{e.godownNumber || "-"}</td>
                          <td>{e.lastLogin || "-"}</td>
                          <td>{e.lastLogout || "-"}</td>
                          {user.role === "Admin" && (
                            <td>
                              <button
                                onClick={() => deleteEmployee(e.employeeNumber)}
                                style={{
                                  background: "red",
                                  color: "white",
                                  border: "none",
                                  padding: "5px 10px",
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Table view for Employee & Cleaner */}
      {view === "employeeList" &&
        (user.role === "Employee" || user.role === "Cleaner") && (
          <div>
            <h2>{user.role} Dashboard</h2>
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Employee Number</th>
                  <th>Role</th>
                  <th>Shift</th>
                  <th>Machine Number</th>
                  <th>Godown Number</th>
                  <th>Last Login</th>
                  <th>Last Logout</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: "yellow" }}>
                  <td>{user.fullName}</td>
                  <td>{user.employeeNumber}</td>
                  <td>{user.role}</td>
                  <td>{user.shift || "-"}</td>
                  <td>{user.machineNumber || "-"}</td>
                  <td>{user.godownNumber || "-"}</td>
                  <td>{user.lastLogin || "-"}</td>
                  <td>{user.lastLogout || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}