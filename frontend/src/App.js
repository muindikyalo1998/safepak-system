import React, { useState } from "react";
import axios from "axios";

function App() {
  const [employees, setEmployees] = useState([]);

  const [empNo, setEmpNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");

  const [loginEmpNo, setLoginEmpNo] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState("");

  // =====================
  // FETCH EMPLOYEES (ONLY AFTER LOGIN)
  // =====================
  const fetchEmployees = async (authToken) => {
    try {
      const res = await axios.get("/api/attendance", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setEmployees(res.data);
    } catch (err) {
      console.log("Error fetching:", err);
    }
  };

  // =====================
  // LOGIN (FIXED)
  // =====================
  const login = async () => {
    try {
      const res = await axios.post("/api/login", {
        employeeNumber: loginEmpNo,
        password: loginPassword,
      });

      setCurrentUser(res.data.user);
      setToken(res.data.token);

      alert("Login successful");

      fetchEmployees(res.data.token);
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  // =====================
  // LOGOUT
  // =====================
  const logout = async () => {
    try {
      await axios.post(
        "/api/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCurrentUser(null);
      setToken("");
      setLoginEmpNo("");
      setLoginPassword("");
      setEmployees([]);
    } catch (err) {
      console.log(err);
    }
  };

  // =====================
  // ADD EMPLOYEE (FIXED)
  // =====================
  const addEmployee = async () => {
    if (!empNo || !fullName || !role || !password) {
      alert("All fields required");
      return;
    }

    try {
      await axios.post(
        "/api/employees",
        {
          employeeNumber: empNo,
          fullName,
          role,
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Employee added");

      setEmpNo("");
      setFullName("");
      setRole("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add employee");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Safepak System</h2>

      {/* ================= LOGIN ================= */}
      {!currentUser && (
        <div>
          <h3>Login</h3>

          <input
            placeholder="Employee Number"
            value={loginEmpNo}
            onChange={(e) => setLoginEmpNo(e.target.value)}
          />
          <br />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          <br />

          <button onClick={login}>Login</button>
        </div>
      )}

      {/* ================= DASHBOARD ================= */}
      {currentUser && (
        <div>
          <h3>Welcome {currentUser.fullName}</h3>
          <button onClick={logout}>Logout</button>

          <hr />

          {/* ================= ADD EMPLOYEE ================= */}
          <h3>Add Employee</h3>

          <input
            placeholder="Employee Number"
            value={empNo}
            onChange={(e) => setEmpNo(e.target.value)}
          />
          <br />

          <input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <br />

          <input
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <br />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />

          <button onClick={addEmployee}>Add Employee</button>

          <hr />

          {/* ================= ATTENDANCE ================= */}
          <h3>Attendance Records</h3>

          <ul>
            {employees.map((a, index) => (
              <li key={index}>
                {a.employeeNumber} - {a.fullName} - {a.role}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;