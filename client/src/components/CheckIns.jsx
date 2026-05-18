import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import api from "./api";
import toast from "react-hot-toast";

const CheckIns = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [progressInputs, setProgressInputs] = useState({});
  const [feedback, setFeedback] = useState({});
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  useEffect(() => {
    if (user.role !== "employee") {
      loadGoals();
    }
  }, []);

  const loadGoals = async () => {
    try {
      const endpoint = user.role === "employee" ? "/goals/my" : "/goals/team";
      const res = await api.get(endpoint);
      const active = res.data.filter(
        (g) => g.status === "approved" || g.status === "locked",
      );
      setGoals(active);
      const initial = {};
      active.forEach((g) => {
        initial[g.id] = {
          achievement: g.actual_value ?? "",
          status: "on_track",
        };
      });
      setProgressInputs(initial);
    } catch (err) {
      toast.error("Failed to load goals");
    }
  };

  const getProgressPercent = (goal, achievement) => {
    const target = parseFloat(goal.target_value);
    const actual = parseFloat(achievement);
    if (isNaN(actual) || isNaN(target)) return null;
    switch (goal.uom_type) {
      case "numeric":
      case "percentage":
        return Math.min((actual / target) * 100, 100).toFixed(1);
      case "timeline":
        return actual > 0
          ? Math.min((target / actual) * 100, 100).toFixed(1)
          : 0;
      case "zero":
        return actual === 0 ? 100 : 0;
      default:
        return Math.min((actual / target) * 100, 100).toFixed(1);
    }
  };

  const updateProgress = async (goalId) => {
    const input = progressInputs[goalId];
    if (input?.achievement === "" || input?.achievement == null) {
      toast.error("Please enter an achievement value");
      return;
    }
    try {
      await api.post(`/progress/${goalId}`, {
        quarter: currentQuarter,
        achievement: parseFloat(input.achievement),
        status: input.status,
      });
      toast.success("Progress updated");
      loadGoals();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const submitFeedback = async (goalId) => {
    const feedbackText = feedback[goalId];
    if (!feedbackText?.trim()) {
      toast.error("Please enter feedback");
      return;
    }
    try {
      await api.post(`/progress/${goalId}/feedback`, {
        quarter: currentQuarter,
        feedback: feedbackText,
      });
      toast.success("Feedback saved");
      setFeedback((prev) => ({ ...prev, [goalId]: "" }));
      loadGoals();
    } catch (err) {
      toast.error("Failed to save feedback");
    }
  };
  if (user.role === "employee") {
    return (
      <div className="card p-8 text-center text-gray-500">
        Check-ins are available only for managers and admins.
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent mb-2">
        Quarterly Check-ins
      </h1>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-xl">
        <p className="font-semibold">
          Current Check-in Window: {currentQuarter}
        </p>
        <p className="text-sm">
          {user.role === "employee"
            ? "Update your achievements for the quarter."
            : "Review your team's progress and add feedback."}
        </p>
      </div>

      {goals.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No approved goals found for check-in.
        </div>
      )}

      <div className="space-y-6">
        {goals.map((goal) => {
          const livePercent = getProgressPercent(
            goal,
            progressInputs[goal.id]?.achievement,
          );
          return (
            <div key={goal.id} className="card p-5">
              {user.role !== "employee" && goal.employee_name && (
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  {goal.employee_name}
                </p>
              )}
              <h3 className="font-bold text-lg">{goal.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{goal.description}</p>

              {/* ← Planned vs Actual Table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Planned Target</p>
                  <p className="font-bold text-lg text-blue-700">
                    {goal.target_value}
                  </p>
                  <p className="text-xs text-gray-400">{goal.uom_type}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Actual Achievement</p>
                  <p className="font-bold text-lg text-green-700">
                    {goal.actual_value != null ? goal.actual_value : "—"}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="font-bold text-lg text-purple-700">
                    {livePercent != null ? `${livePercent}%` : "—"}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Weightage</p>
                  <p className="font-bold text-lg text-amber-700">
                    {goal.weightage}%
                  </p>
                </div>
              </div>

              {/* ← Progress bar */}
              {livePercent != null && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(livePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {livePercent}% of target achieved
                  </p>
                </div>
              )}

              {/* Manager feedback display */}
              {goal.manager_feedback?.trim() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3 text-sm">
                  <p className="font-semibold text-yellow-800">
                    Manager Feedback:
                  </p>
                  <p className="text-yellow-700">{goal.manager_feedback}</p>
                </div>
              )}

              {/* Employee input */}
              {user.role === "employee" && (
                <div className="border-t pt-4 mt-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">
                        Achievement Value
                      </label>
                      <input
                        type="number"
                        placeholder={`Enter value (Target: ${goal.target_value})`}
                        className="input"
                        value={progressInputs[goal.id]?.achievement ?? ""}
                        onChange={(e) =>
                          setProgressInputs((prev) => ({
                            ...prev,
                            [goal.id]: {
                              ...prev[goal.id],
                              achievement: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Status
                      </label>
                      <select
                        className="input"
                        value={progressInputs[goal.id]?.status ?? "on_track"}
                        onChange={(e) =>
                          setProgressInputs((prev) => ({
                            ...prev,
                            [goal.id]: {
                              ...prev[goal.id],
                              status: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <button
                      onClick={() => updateProgress(goal.id)}
                      className="btn-primary"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Manager feedback input */}
              {(user.role === "manager" || user.role === "admin") && (
                <div className="border-t pt-4 mt-3">
                  <label className="block text-sm font-medium mb-1">
                    Add Check-in Comment
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 input"
                      rows="2"
                      placeholder="Document the check-in discussion..."
                      value={feedback[goal.id] || ""}
                      onChange={(e) =>
                        setFeedback((prev) => ({
                          ...prev,
                          [goal.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={() => submitFeedback(goal.id)}
                      className="btn-primary whitespace-nowrap"
                    >
                      Send Feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckIns;
