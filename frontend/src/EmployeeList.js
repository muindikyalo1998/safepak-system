import React, { useEffect, useState } from "react";
import axios from "axios";

function EmployeeList({ userRole }) {
  const [employees, setEmployees] = useState([]);

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const res = await axios.get("http://localhost:5000/employees");
    setEmployees(res.data);
  };

  // DELETE EMPLOYEE (ADMIN ONLY)
  const deleteEmployee = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/employees/${id}`);
      setEmployees(employees.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  return (
    <div>
      <h2>Employee List</h2>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Employee Number</th>
            <th>Role</th>
            <th>Shift</th>

            {userRole === "Admin" && <th>Action</th>}
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.fullName}</td>
              <td>{emp.employeeNumber}</td>
              <td>{emp.role}</td>
              <td>{emp.shift}</td>

              {userRole === "Admin" && (
                <td>
                  <button
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                    onClick={() => deleteEmployee(emp.id)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeList;