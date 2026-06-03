const API_URL = "http://localhost:3000/api";

export async function registerEmployee(data) {
  const res = await fetch(`${API_URL}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getEmployees() {
  const res = await fetch(`${API_URL}/employees`);
  return res.json();
}

export async function registerSupervisor(data) {
  const res = await fetch(`${API_URL}/supervisors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function allocateMachine(employeeNumber, machineNumber) {
  const res = await fetch(`${API_URL}/employees/${employeeNumber}/machine`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ machineNumber }),
  });
  return res.json();
}