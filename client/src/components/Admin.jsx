import React, { useState, useEffect } from "react";
import api from "./api";
import toast from "react-hot-toast";
import { UserPlus, Unlock, RefreshCw } from "lucide-react";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "employee",
    department: "",
    manager_id: "",
  });
  const [unlockEmail, setUnlockEmail] = useState("");

  useEffect(() => {
    loadUsers();
    loadAudit();
  }, []);

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const loadAudit = async () => {
    const res = await api.get("/admin/audit");
    setAuditLogs(res.data);
  };

  const managers = users.filter(
    (u) => u.role === "manager" || u.role === "admin",
  );

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", {
        ...newUser,
        manager_id: newUser.manager_id || null,
      });
      toast.success("User created");
      loadUsers();
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role: "employee",
        department: "",
        manager_id: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Creation failed");
    }
  };

  const unlockGoals = async () => {
    if (!unlockEmail) return;
    try {
      await api.post("/admin/unlock-goals", { email: unlockEmail });
      toast.success("Goals unlocked");
      setUnlockEmail("");
    } catch (err) {
      toast.error("Failed to unlock");
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Delete this user? All goals will be lost.")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("User deleted");
      loadUsers();
    } catch (err) {
      toast.error("Cannot delete admin user");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent mb-8">
        Admin Panel
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Management */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-primary-600" /> User Management
          </h2>
          <form onSubmit={createUser} className="space-y-3 mb-6">
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              className="input"
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({ ...newUser, full_name: e.target.value })
              }
              required
            />
            <select
              className="input"
              value={newUser.role}
              onChange={(e) =>
                setNewUser({ ...newUser, role: e.target.value, manager_id: "" })
              }
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="text"
              placeholder="Department"
              className="input"
              value={newUser.department}
              onChange={(e) =>
                setNewUser({ ...newUser, department: e.target.value })
              }
            />
            {newUser.role === "employee" && (
              <select
                className="input"
                value={newUser.manager_id}
                onChange={(e) =>
                  setNewUser({ ...newUser, manager_id: e.target.value })
                }
              >
                <option value="">
                  — Assign Manager (required for approvals) —
                </option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            )}
            <button type="submit" className="btn-primary w-full">
              Create User
            </button>
          </form>

          <div className="max-h-64 overflow-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex justify-between items-center border-b py-3"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {user.email} | {user.role} | {user.department || "—"}
                  </p>
                  {user.manager_name && (
                    <p className="text-xs text-blue-600">
                      Reports to: {user.manager_name}
                    </p>
                  )}
                  {user.role === "employee" && !user.manager_id && (
                    <p className="text-xs text-red-500">
                      ⚠ No manager assigned — goals cannot be approved
                    </p>
                  )}
                </div>
                {user.role !== "admin" && (
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-danger text-sm hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unlock Goals */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Unlock size={20} className="text-warning-600" /> Unlock Locked
            Goals
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Employee email"
              className="input"
              value={unlockEmail}
              onChange={(e) => setUnlockEmail(e.target.value)}
            />
            <button
              onClick={unlockGoals}
              className="btn-warning whitespace-nowrap flex items-center gap-1"
            >
              <Unlock size={16} /> Unlock
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Unlock allows employee to edit approved/locked goals.
          </p>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <RefreshCw size={20} className="text-gray-600" /> Audit Trail
        </h2>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Changes</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{log.user_name}</td>
                  <td className="p-3 uppercase text-xs">{log.action}</td>
                  <td className="p-3">{log.entity_type}</td>
                  <td className="p-3 text-xs truncate max-w-xs">
                    {log.old_value
                      ? typeof log.old_value === "object"
                        ? JSON.stringify(log.old_value)
                        : log.old_value
                      : log.new_value
                        ? typeof log.new_value === "object"
                          ? JSON.stringify(log.new_value)
                          : log.new_value
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
