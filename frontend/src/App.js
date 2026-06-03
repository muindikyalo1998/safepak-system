import React, { useEffect, useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

function App() {

  const API = "http://localhost:5000/api";

  /* ================= STATES ================= */

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);

  const [role, setRole] = useState("");

  const [attendance, setAttendance] = useState([]);
  const [salarySummary, setSalarySummary] = useState([]);

  /* ================= MONTHLY REPORT ================= */

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState([]);

  /* ================= ADMIN STATES ================= */

  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [newEmployeeNumber, setNewEmployeeNumber] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("Employee");

  const [updateEmployeeNumber, setUpdateEmployeeNumber] = useState("");
  const [updateFullName, setUpdateFullName] = useState("");
  const [updateRole, setUpdateRole] = useState("Employee");

  const [deleteEmployeeNumber, setDeleteEmployeeNumber] = useState("");

  /* ================= AUTH ================= */

  const getToken = () => localStorage.getItem("token");

  const authHeader = useCallback(() => ({
    Authorization: "Bearer " + getToken()
  }), []);

  /* ================= LOGIN ================= */

  const login = async () => {

    const res = await fetch(API + "/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        employeeNumber,
        password
      })
    });

    const data = await res.json();

    if (data.token) {

      localStorage.setItem("token", data.token);

      setLoggedIn(true);

      setRole(data.user.role);

      setPassword("");

      loadAll();

    } else {

      alert(data.error || "Login failed");
    }
  };

  /* ================= LOAD DATA ================= */

  const loadAttendance = useCallback(async () => {

    const res = await fetch(API + "/attendance", {
      headers: authHeader()
    });

    const data = await res.json();

    setAttendance(Array.isArray(data) ? data : []);

  }, [authHeader, API]);

  const loadSalarySummary = useCallback(async () => {

    if (role !== "Admin") return;

    const res = await fetch(API + "/salary-summary", {
      headers: authHeader()
    });

    const data = await res.json();

    setSalarySummary(Array.isArray(data) ? data : []);

  }, [authHeader, role, API]);

  const loadAll = useCallback(() => {

    loadAttendance();

    if (role === "Admin") {
      loadSalarySummary();
    }

  }, [loadAttendance, loadSalarySummary, role]);

  /* ================= MONTHLY REPORT ================= */

  const loadMonthlyReport = async () => {

    const empNo = prompt("Enter Employee Number");

    if (!empNo) return;

    const res = await fetch(
      `${API}/salary-monthly?month=${month}&year=${year}&employeeNumber=${empNo}`,
      {
        headers: authHeader()
      }
    );

    const data = await res.json();

    setMonthlyReport(Array.isArray(data) ? data : []);
  };

  /* ================= MONTHLY PDF ================= */

  const downloadMonthlyPDF = () => {

    const doc = new jsPDF();

    doc.text("SAFEPAK MONTHLY REPORT", 14, 10);

    doc.text(`Month: ${month} Year: ${year}`, 14, 20);

    const tableColumn = [
      "Emp No",
      "Name",
      "Role",
      "Hours",
      "Salary"
    ];

    const tableRows = [];

    monthlyReport.forEach(emp => {

      tableRows.push([
        emp.employeeNumber,
        emp.fullName,
        emp.role,
        emp.totalHours,
        "KSh " + emp.salary
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30
    });

    doc.save(`monthly-report-${month}-${year}.pdf`);
  };

  /* ================= DOWNLOAD PAYSLIP ================= */

  const downloadPayslip = async () => {

    try {

      const empNo = prompt("Enter Employee Number");

      if (!empNo) return;

      const res = await fetch(
        `${API}/payslip/${empNo}`,
        {
          headers: authHeader()
        }
      );

      if (!res.ok) {

        const err = await res.json();

        alert(err.error || "Failed to download payslip");

        return;
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `${empNo}-payslip.pdf`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {

      console.log(err);

      alert("Payslip download failed");
    }
  };

  /* ================= ADD EMPLOYEE ================= */

  const addEmployee = async () => {

    const res = await fetch(API + "/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader()
      },
      body: JSON.stringify({
        employeeNumber: newEmployeeNumber,
        fullName: newFullName,
        role: newRole
      })
    });

    const data = await res.json();

    alert(data.message || data.error);

    setNewEmployeeNumber("");
    setNewFullName("");
    setNewRole("Employee");

    setShowAdd(false);
  };

  /* ================= UPDATE EMPLOYEE ================= */

  const updateEmployee = async () => {

    const res = await fetch(
      `${API}/employees/${updateEmployeeNumber}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify({
          fullName: updateFullName,
          role: updateRole
        })
      }
    );

    const data = await res.json();

    alert(data.message || data.error);

    setUpdateEmployeeNumber("");
    setUpdateFullName("");
    setUpdateRole("Employee");

    setShowUpdate(false);
  };

  /* ================= DELETE EMPLOYEE ================= */

  const deleteEmployee = async () => {

    const res = await fetch(
      `${API}/employees/${deleteEmployeeNumber}`,
      {
        method: "DELETE",
        headers: authHeader()
      }
    );

    const data = await res.json();

    alert(data.message || data.error);

    setDeleteEmployeeNumber("");

    setShowDelete(false);
  };

  /* ================= AUTO LOGIN ================= */

  useEffect(() => {

    if (getToken()) {

      setLoggedIn(true);

      loadAttendance();
    }

  }, [loadAttendance]);

  /* ================= LOGOUT ================= */

  const logout = async () => {

    await fetch(API + "/logout", {
      method: "POST",
      headers: authHeader()
    });

    localStorage.removeItem("token");

    setLoggedIn(false);

    setRole("");

    setEmployeeNumber("");

    setPassword("");

    setAttendance([]);

    setSalarySummary([]);

    setMonthlyReport([]);
  };

  /* ================= LOGIN SCREEN ================= */

  if (!loggedIn) {

    return (

      <div className="login-container">

        <h2>Safepak Login</h2>

        <input
          placeholder="Employee Number"
          value={employeeNumber}
          onChange={(e) => {

            setEmployeeNumber(e.target.value);

            if (e.target.value !== "001") {
              setPassword("");
            }
          }}
        />

        {employeeNumber === "001" && (

          <input
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        <button onClick={login}>
          Login
        </button>

      </div>
    );
  }

  /* ================= DASHBOARD ================= */

  return (

    <div className="dashboard">

      <h2>Safepak Dashboard</h2>

      <button onClick={logout}>
        Logout
      </button>

      {/* ================= ADMIN ONLY ================= */}

      {role === "Admin" && (

        <div>

          <h3>Admin Controls</h3>

          <button onClick={() => {
            setShowAdd(true);
            setShowUpdate(false);
            setShowDelete(false);
          }}>
            Add Employee
          </button>

          <button onClick={() => {
            setShowUpdate(true);
            setShowAdd(false);
            setShowDelete(false);
          }}>
            Update Employee
          </button>

          <button onClick={() => {
            setShowDelete(true);
            setShowAdd(false);
            setShowUpdate(false);
          }}>
            Delete Employee
          </button>

          {/* ADD */}

          {showAdd && (

            <div>

              <h4>Add Employee</h4>

              <input
                placeholder="Employee Number"
                value={newEmployeeNumber}
                onChange={(e) =>
                  setNewEmployeeNumber(e.target.value)
                }
              />

              <input
                placeholder="Full Name"
                value={newFullName}
                onChange={(e) =>
                  setNewFullName(e.target.value)
                }
              />

              <select
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value)
                }
              >
                <option>Employee</option>
                <option>Cleaner</option>
                <option>Supervisor</option>
                <option>Admin</option>
              </select>

              <button onClick={addEmployee}>
                Save
              </button>

              <button onClick={() => {
                setShowAdd(false);
              }}>
                Cancel
              </button>

            </div>
          )}

          {/* UPDATE */}

          {showUpdate && (

            <div>

              <h4>Update Employee</h4>

              <input
                placeholder="Employee Number"
                value={updateEmployeeNumber}
                onChange={(e) =>
                  setUpdateEmployeeNumber(e.target.value)
                }
              />

              <input
                placeholder="Full Name"
                value={updateFullName}
                onChange={(e) =>
                  setUpdateFullName(e.target.value)
                }
              />

              <select
                value={updateRole}
                onChange={(e) =>
                  setUpdateRole(e.target.value)
                }
              >
                <option>Employee</option>
                <option>Cleaner</option>
                <option>Supervisor</option>
                <option>Admin</option>
              </select>

              <button onClick={updateEmployee}>
                Update
              </button>

              <button onClick={() => {
                setShowUpdate(false);
              }}>
                Cancel
              </button>

            </div>
          )}

          {/* DELETE */}

          {showDelete && (

            <div>

              <h4>Delete Employee</h4>

              <input
                placeholder="Employee Number"
                value={deleteEmployeeNumber}
                onChange={(e) =>
                  setDeleteEmployeeNumber(e.target.value)
                }
              />

              <button onClick={deleteEmployee}>
                Delete
              </button>

              <button onClick={() => {
                setShowDelete(false);
              }}>
                Cancel
              </button>

            </div>
          )}

          {/* MONTHLY REPORT */}

          <h3>Monthly Salary Report</h3>

          <input
            type="number"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="Month"
          />

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
          />

          <button onClick={loadMonthlyReport}>
            Load Report
          </button>

          <button onClick={downloadMonthlyPDF}>
            Download PDF
          </button>

          <button onClick={downloadPayslip}>
            Download Payslip
          </button>

          <table border="1">

            <thead>
              <tr>
                <th>Emp No</th>
                <th>Name</th>
                <th>Role</th>
                <th>Hours</th>
                <th>Salary</th>
              </tr>
            </thead>

            <tbody>

              {monthlyReport.map((e, i) => (

                <tr key={i}>
                  <td>{e.employeeNumber}</td>
                  <td>{e.fullName}</td>
                  <td>{e.role}</td>
                  <td>{e.totalHours}</td>
                  <td>KSh {e.salary}</td>
                </tr>
              ))}

            </tbody>

          </table>

          {/* SALARY SUMMARY */}

          <h3>Salary Summary</h3>

          <table border="1">

            <thead>
              <tr>
                <th>Emp No</th>
                <th>Name</th>
                <th>Role</th>
                <th>Hours</th>
                <th>Salary</th>
              </tr>
            </thead>

            <tbody>

              {salarySummary.map((e, i) => (

                <tr key={i}>
                  <td>{e.employeeNumber}</td>
                  <td>{e.fullName}</td>
                  <td>{e.role}</td>
                  <td>{e.totalHours}</td>
                  <td>KSh {e.salary}</td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>
      )}

      {/* ================= ATTENDANCE ================= */}

      <h3>Attendance Records</h3>

      <table border="1">

        <thead>
          <tr>
            <th>Emp No</th>
            <th>Name</th>
            <th>Role</th>
            <th>Shift</th>
            <th>Login</th>
            <th>Logout</th>
            <th>Minutes</th>
          </tr>
        </thead>

        <tbody>

          {attendance.map((a, i) => (

            <tr key={i}>
              <td>{a.employeeNumber}</td>
              <td>{a.fullName}</td>
              <td>{a.role}</td>
              <td>{a.shift || "-"}</td>
              <td>{a.loginTime}</td>
              <td>{a.logoutTime || "ACTIVE"}</td>
              <td>{a.workedMinutes}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

export default App;