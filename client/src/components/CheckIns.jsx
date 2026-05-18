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
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const endpoint =
        user.role === "employee"
          ? "/goals/my"
          : "/goals/team";

      const res = await api.get(endpoint);

      const active = res.data.filter(
        (g) => g.status === "approved" || g.status === "locked"
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
      console.error(err);
      toast.error("Failed to load goals");
    }
  };

  const getProgressPercent = (goal, achievement) => {
    const target = parseFloat(goal.target_value);

    const actual = parseFloat(
      achievement ?? goal.actual_value
    );

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
      toast.error("Please enter achievement");
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
      console.error(err);
      toast.error(
        err.response?.data?.error || "Update failed"
      );
    }
  };

  const submitFeedback = async (goalId) => {
    const feedbackText = feedback[goalId];

    if (!feedbackText?.trim()) {
      toast.error("Enter feedback");
      return;
    }

    try {
      await api.post(`/progress/${goalId}/feedback`, {
        quarter: currentQuarter,
        feedback: feedbackText,
      });

      toast.success("Feedback saved");

      setFeedback((prev) => ({
        ...prev,
        [goalId]: "",
      }));

      loadGoals();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to save feedback"
      );
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Quarterly Check-ins
      </h1>

      <div className="space-y-6">
        {goals.map((goal) => {
          const livePercent = getProgressPercent(
            goal,
            progressInputs[goal.id]?.achievement
          );

          const latestFeedback =
            goal.checkins
              ?.filter((c) => c.manager_feedback)
              ?.sort(
                (a, b) =>
                  new Date(b.created_at) -
                  new Date(a.created_at)
              )?.[0];

          return (
            <div
              key={goal.id}
              className="card p-5 border rounded-xl"
            >
              {goal.employee_name &&
                user.role !== "employee" && (
                  <p className="text-sm text-blue-600 mb-1">
                    {goal.employee_name}
                  </p>
                )}

              <h3 className="font-bold text-lg">
                {goal.title}
              </h3>

              <p className="text-gray-600 text-sm mb-4">
                {goal.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs">Target</p>
                  <p className="font-bold">
                    {goal.target_value}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs">Achievement</p>
                  <p className="font-bold">
                    {goal.actual_value ?? "—"}
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs">Progress</p>
                  <p className="font-bold">
                    {livePercent != null
                      ? `${livePercent}%`
                      : "—"}
                  </p>
                </div>

                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-xs">Weightage</p>
                  <p className="font-bold">
                    {goal.weightage}%
                  </p>
                </div>
              </div>

              {livePercent != null && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 h-2 rounded-full">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          livePercent,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {latestFeedback && (
                <div className="bg-yellow-50 border p-3 rounded mb-4">
                  <p className="font-semibold">
                    Latest Manager Feedback
                  </p>

                  <p>
                    {latestFeedback.manager_feedback}
                  </p>
                </div>
              )}

              {/* EMPLOYEE */}
              {user.role === "employee" && (
                <div className="border-t pt-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="number"
                      className="input flex-1"
                      placeholder="Achievement"
                      value={
                        progressInputs[goal.id]
                          ?.achievement ?? ""
                      }
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

                    <select
                      className="input"
                      value={
                        progressInputs[goal.id]
                          ?.status ?? "on_track"
                      }
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
                      <option value="not_started">
                        Not Started
                      </option>

                      <option value="on_track">
                        On Track
                      </option>

                      <option value="completed">
                        Completed
                      </option>
                    </select>

                    <button
                      onClick={() =>
                        updateProgress(goal.id)
                      }
                      className="btn-primary"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* MANAGER */}
              {(user.role === "manager" ||
                user.role === "admin") && (
                <div className="border-t pt-4">
                  <textarea
                    className="input w-full mb-2"
                    rows="3"
                    placeholder="Add feedback..."
                    value={feedback[goal.id] || ""}
                    onChange={(e) =>
                      setFeedback((prev) => ({
                        ...prev,
                        [goal.id]: e.target.value,
                      }))
                    }
                  />

                  <button
                    onClick={() =>
                      submitFeedback(goal.id)
                    }
                    className="btn-primary"
                  >
                    Send Feedback
                  </button>
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