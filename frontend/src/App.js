import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://safepak-system-production.up.railway.app";

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

  /* ================= LOGIN ================= */
  const login = async () => {
  try {

    console.log("Sending login:", {
      employeeNumber: loginEmpNo,
      password: loginPassword,
    });

    const res = await axios.post(`${API_BASE}/api/login`, {
      employeeNumber: loginEmpNo,
      password: loginPassword,
    });

      setCurrentUser(res.data.user);
      setToken(res.data.token);

      alert("Login successful");
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  /* ================= FETCH DATA ================= */
  const fetchAttendance = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/api/attendance`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setEmployees(res.data);
    } catch (err) {
      console.log("Fetch error:", err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAttendance(token);
    }
  }, [token]);

  /* ================= LOGOUT ================= */
const logout = async () => {
  try {
    await axios.post(
      `${API_BASE}/api/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err) {
    console.log(err);
  }

  setCurrentUser(null);
  setToken("");
  setEmployees([]);

  setLoginEmpNo("");
  setLoginPassword("");

  setEmpNo("");
  setFullName("");
  setRole("");
  setPassword("");

  window.location.href = "/";
};
  /* ================= ADD EMPLOYEE ================= */
  const addEmployee = async () => {
    if (!empNo || !fullName || !role || !password) {
      alert("All fields required");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/api/employees`,
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
  type="text"
  name="login-employee-number"
  autoComplete="off"
  placeholder="Employee Number"
  value={loginEmpNo}
  onChange={(e) => setLoginEmpNo(e.target.value)}
/>
          <br />

          <input
  type="password"
  name="login-password"
  autoComplete="new-password"
  placeholder="Password"
  value={loginPassword}
  onChange={(e) => setLoginPassword(e.target.value)}
/>
<p>Debug Password: {loginPassword}</p>
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

          {currentUser?.role === "Admin" && (
  <>
    <hr />

    <h3>Add Employee</h3>

    <input
      type="text"
      name="new-employee-number"
      autoComplete="off"
      placeholder="Employee Number"
      value={empNo}
      onChange={(e) => setEmpNo(e.target.value)}
    />
    <br />

    <input
      autoComplete="off"
      placeholder="Full Name"
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
    />
    <br />

    <input
      autoComplete="off"
      placeholder="Role"
      value={role}
      onChange={(e) => setRole(e.target.value)}
    />
    <br />

    <input
      type="password"
      name="new-employee-password"
      autoComplete="new-password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <br />

    <button onClick={addEmployee}>Add Employee</button>
  </>
)}

          <hr />

          <h3>Records</h3>

          {employees.length === 0 ? (
            <p>No data yet (attendance table is empty)</p>
          ) : (
            <ul>
              {employees.map((a, i) => (
                <li key={i}>
                  {a.employeeNumber} - {a.fullName} - {a.role}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;