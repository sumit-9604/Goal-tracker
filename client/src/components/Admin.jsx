import React, { useState, useEffect } from "react";
import api from "./api";
import toast from "react-hot-toast";
import {
  UserPlus,
  Unlock,
  RefreshCw,
  Trash2,
  Shield,
  Users,
  Briefcase,
  Loader2,
} from "lucide-react";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const [creatingUser, setCreatingUser] = useState(false);
  const [unlockingGoals, setUnlockingGoals] = useState(false);
  const [pushingGoal, setPushingGoal] = useState(false);

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "employee",
    department: "",
    manager_id: "",
  });

  const [unlockEmail, setUnlockEmail] = useState("");

  const [sharedGoal, setSharedGoal] = useState({
    title: "",
    description: "",
    thrust_area: "",
    uom_type: "numeric",
    target_value: "",
    deadline: "",
    employee_ids: [],
  });

  useEffect(() => {
    loadUsers();
    loadAudit();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.get("/admin/audit");
      setAuditLogs(res.data || []);
    } catch (err) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoadingAudit(false);
    }
  };

  const managers = users.filter(
    (u) => u.role === "manager" || u.role === "admin",
  );

  const employees = users.filter((u) => u.role === "employee");

  const createUser = async (e) => {
    e.preventDefault();

    try {
      setCreatingUser(true);

      await api.post("/admin/users", {
        ...newUser,
        manager_id: newUser.manager_id || null,
      });

      toast.success("User created successfully");

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role: "employee",
        department: "",
        manager_id: "",
      });

      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Creation failed");
    } finally {
      setCreatingUser(false);
    }
  };

  const pushSharedGoal = async (e) => {
    e.preventDefault();

    try {
      setPushingGoal(true);

      await api.post("/goals/shared", sharedGoal);

      toast.success(
        `Goal pushed to ${sharedGoal.employee_ids.length} employees`,
      );

      setSharedGoal({
        title: "",
        description: "",
        thrust_area: "",
        uom_type: "numeric",
        target_value: "",
        deadline: "",
        employee_ids: [],
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to push goal");
    } finally {
      setPushingGoal(false);
    }
  };

  const unlockGoals = async () => {
    if (!unlockEmail) return;

    try {
      setUnlockingGoals(true);

      await api.post("/admin/unlock-goals", {
        email: unlockEmail,
      });

      toast.success("Goals unlocked successfully");

      setUnlockEmail("");

      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to unlock goals");
    } finally {
      setUnlockingGoals(false);
    }
  };

  const deleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Delete this user? All goals will be permanently lost.",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${userId}`);

      toast.success("User deleted");

      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Cannot delete user");
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "manager":
        return "bg-green-100 text-green-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>

        <p className="text-gray-500 mt-2">
          Manage users, goals, permissions, and audit activity.
        </p>
      </div>

      {/* TOP GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* USER MANAGEMENT */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <UserPlus className="text-primary-700" size={22} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                User Management
              </h2>

              <p className="text-sm text-gray-500">
                Create and manage platform users
              </p>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={createUser} className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              className="input"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  email: e.target.value,
                })
              }
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="input"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  password: e.target.value,
                })
              }
              required
            />

            <input
              type="text"
              placeholder="Full Name"
              className="input"
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  full_name: e.target.value,
                })
              }
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="input"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    role: e.target.value,
                    manager_id: "",
                  })
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
                  setNewUser({
                    ...newUser,
                    department: e.target.value,
                  })
                }
              />
            </div>

            {newUser.role === "employee" && (
              <select
                className="input"
                value={newUser.manager_id}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    manager_id: e.target.value,
                  })
                }
              >
                <option value="">
                  Assign Manager (required for approvals)
                </option>

                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name} ({manager.role})
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={creatingUser}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {creatingUser ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create User
                </>
              )}
            </button>
          </form>

          {/* USERS LIST */}
          <div className="mt-8">
            <h3 className="font-semibold text-gray-700 mb-4">
              Existing Users
            </h3>

            <div className="max-h-[450px] overflow-y-auto space-y-3 pr-1">
              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-primary-600" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No users found
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">
                            {user.full_name}
                          </p>

                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadge(
                              user.role,
                            )}`}
                          >
                            {user.role}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500">
                          {user.email}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Briefcase size={14} />
                          {user.department || "No Department"}
                        </div>

                        {user.manager_name && (
                          <div className="text-xs text-blue-600 font-medium">
                            Reports to: {user.manager_name}
                          </div>
                        )}

                        {user.role === "employee" &&
                          !user.manager_id && (
                            <div className="text-xs text-red-500 font-medium">
                              ⚠ No manager assigned — approvals disabled
                            </div>
                          )}
                      </div>

                      {user.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-8">
          {/* UNLOCK GOALS */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-yellow-100 p-2 rounded-xl">
                <Unlock className="text-yellow-700" size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Unlock Goals
                </h2>

                <p className="text-sm text-gray-500">
                  Allow employees to edit locked goals
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Employee Email"
                className="input"
                value={unlockEmail}
                onChange={(e) => setUnlockEmail(e.target.value)}
              />

              <button
                onClick={unlockGoals}
                disabled={unlockingGoals}
                className="btn-warning w-full flex items-center justify-center gap-2"
              >
                {unlockingGoals ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock size={18} />
                    Unlock Goals
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SHARED GOALS */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-green-100 p-2 rounded-xl">
                <Shield className="text-green-700" size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Push Shared Goal
                </h2>

                <p className="text-sm text-gray-500">
                  Assign goals to multiple employees
                </p>
              </div>
            </div>

            <form onSubmit={pushSharedGoal} className="space-y-4">
              <input
                type="text"
                placeholder="Goal Title"
                className="input"
                value={sharedGoal.title}
                onChange={(e) =>
                  setSharedGoal({
                    ...sharedGoal,
                    title: e.target.value,
                  })
                }
                required
              />

              <textarea
                placeholder="Goal Description"
                rows={4}
                className="input resize-none"
                value={sharedGoal.description}
                onChange={(e) =>
                  setSharedGoal({
                    ...sharedGoal,
                    description: e.target.value,
                  })
                }
              />

              <input
                type="text"
                placeholder="Thrust Area"
                className="input"
                value={sharedGoal.thrust_area}
                onChange={(e) =>
                  setSharedGoal({
                    ...sharedGoal,
                    thrust_area: e.target.value,
                  })
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="input"
                  value={sharedGoal.uom_type}
                  onChange={(e) =>
                    setSharedGoal({
                      ...sharedGoal,
                      uom_type: e.target.value,
                    })
                  }
                >
                  <option value="numeric">Numeric</option>
                  <option value="percentage">Percentage</option>
                  <option value="timeline">Timeline</option>
                  <option value="zero">Zero-based</option>
                </select>

                <input
                  type="number"
                  placeholder="Target Value"
                  className="input"
                  value={sharedGoal.target_value}
                  onChange={(e) =>
                    setSharedGoal({
                      ...sharedGoal,
                      target_value: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <input
                type="date"
                className="input"
                value={sharedGoal.deadline}
                onChange={(e) =>
                  setSharedGoal({
                    ...sharedGoal,
                    deadline: e.target.value,
                  })
                }
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employees
                </label>

                <select
                  multiple
                  value={sharedGoal.employee_ids}
                  className="input h-40"
                  onChange={(e) =>
                    setSharedGoal({
                      ...sharedGoal,
                      employee_ids: Array.from(
                        e.target.selectedOptions || [],
                        (option) => parseInt(option.value),
                      ),
                    })
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} — {employee.department}
                    </option>
                  ))}
                </select>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    Hold Ctrl/Cmd to select multiple
                  </p>

                  <p className="text-xs font-medium text-primary-600">
                    {sharedGoal.employee_ids.length} selected
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={pushingGoal}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {pushingGoal ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Pushing Goal...
                  </>
                ) : (
                  <>
                    <Users size={18} />
                    Push Goal
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* AUDIT TRAIL */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gray-100 p-2 rounded-xl">
            <RefreshCw className="text-gray-700" size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Audit Trail
            </h2>

            <p className="text-sm text-gray-500">
              Track all system activities and changes
            </p>
          </div>
        </div>

        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Time
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  User
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Action
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Entity
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Changes
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingAudit ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto text-primary-600" />
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-gray-400 py-8"
                  >
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {log.user_name}
                    </td>

                    <td className="px-4 py-3">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase font-semibold">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {log.entity_type}
                    </td>

                    <td className="px-4 py-3 max-w-md">
                      <div className="bg-gray-100 rounded-lg p-2 overflow-auto text-xs font-mono max-h-32">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(
                            log.old_value ||
                              log.new_value ||
                              "—",
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;