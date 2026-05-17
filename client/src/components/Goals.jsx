import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import api from "./api";
import toast from "react-hot-toast";
import { Edit2, Trash2, CheckCircle, XCircle, Send, Plus } from 'lucide-react';

const Goals = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const initialForm = {
    title: "", description: "", thrust_area: "", uom_type: "numeric",
    target_value: "", weightage: 10, deadline: "",
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { if (user) loadGoals(); }, [user]);

  const loadGoals = async () => {
    try {
      const endpoint = (user.role === "manager" || user.role === "admin") ? "/goals/team" : "/goals/my";
      const res = await api.get(endpoint);
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load goals");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        if (user.role === "manager" || user.role === "admin") {
          await api.put(`/goals/${editingGoal.id}/manager-edit`, formData);
        } else {
          await api.put(`/goals/${editingGoal.id}`, formData);
        }
        toast.success("Goal updated");
      } else {
        await api.post("/goals", formData);
        toast.success("Goal created");
      }
      setShowForm(false);
      setEditingGoal(null);
      setFormData(initialForm);
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error saving goal");
    }
  };

  const submitForApproval = async () => {
    try {
      await api.post("/goals/submit");
      toast.success("Goals submitted for approval");
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit goals");
    }
  };

  const approveGoal = async (goalId, action) => {
    try {
      await api.put(`/goals/${goalId}/approve`, { action });
      toast.success(`Goal ${action}d`);
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update goal");
    }
  };

  const deleteGoal = async (goalId) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await api.delete(`/goals/${goalId}`);
      toast.success("Goal deleted");
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Cannot delete approved goal");
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title || "",
      description: goal.description || "",
      thrust_area: goal.thrust_area || "",
      uom_type: goal.uom_type || "numeric",
      target_value: goal.target_value || "",
      weightage: goal.weightage || 10,
      deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const draftGoals = goals.filter(g => g.status === "draft");
  const totalWeightage = draftGoals.reduce((sum, g) => sum + Number(g.weightage || 0), 0);
  const canSubmit = draftGoals.length > 0 && Math.abs(totalWeightage - 100) < 0.01 && draftGoals.every(g => g.weightage >= 10);

  const getStatusBadge = (status) => {
    const classes = {
      draft: "badge-neutral",
      pending: "badge-warning",
      approved: "badge-success",
      rejected: "badge-danger",
      locked: "badge-info",
    };
    return `badge ${classes[status] || "badge-neutral"}`;
  };

  if (!user) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
          Goals
        </h1>
        {user.role === "employee" && (
          <div className="flex gap-3">
            <button onClick={() => { setEditingGoal(null); setFormData(initialForm); setShowForm(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Goal
            </button>
            {canSubmit && (
              <button onClick={submitForApproval} className="btn-success flex items-center gap-2">
                <Send size={18} /> Submit for Approval
              </button>
            )}
          </div>
        )}
      </div>

      {user.role === "employee" && draftGoals.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <p className="text-sm font-medium">Total weightage: {totalWeightage}%</p>
          {totalWeightage !== 100 && <p className="text-red-600 text-sm mt-1">Total weightage must be 100%</p>}
          <p className="text-xs text-gray-600 mt-1">Each goal minimum 10%. Maximum 8 goals allowed.</p>
        </div>
      )}

      <div className="space-y-5">
        {goals.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No goals found</div>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className="card p-5 transition-all hover:shadow-xl">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{goal.title}</h3>
                    <span className={getStatusBadge(goal.status)}>{goal.status}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">{goal.thrust_area}</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Weight: {goal.weightage}%</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Target: {goal.target_value}</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Type: {goal.uom_type}</span>
                    {goal.deadline && <span className="bg-gray-100 px-3 py-1 rounded-full">Due: {new Date(goal.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                {user.role === "employee" && goal.status === "draft" && (
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(goal)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                {(user.role === "manager" || user.role === "admin") && (
                  <div className="flex gap-2">
                    {goal.status === "pending" && (
                      <>
                        <button onClick={() => approveGoal(goal.id, "approve")} className="btn-success flex items-center gap-1 text-sm">
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button onClick={() => approveGoal(goal.id, "reject")} className="btn-danger flex items-center gap-1 text-sm">
                          <XCircle size={16} /> Reject
                        </button>
                      </>
                    )}
                    <button onClick={() => openEditModal(goal)} className="btn-primary text-sm">Edit</button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-bold mb-5">{editingGoal ? "Edit Goal" : "Create New Goal"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Goal Title" className="input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              <textarea placeholder="Description" rows="3" className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <input type="text" placeholder="Thrust Area (e.g., Sales, Learning)" className="input" value={formData.thrust_area} onChange={e => setFormData({...formData, thrust_area: e.target.value})} />
              <select className="input" value={formData.uom_type} onChange={e => setFormData({...formData, uom_type: e.target.value})}>
                <option value="numeric">Numeric (Min/Max)</option>
                <option value="percentage">Percentage</option>
                <option value="timeline">Timeline (0/1)</option>
                <option value="zero">Zero‑based</option>
              </select>
              <input type="number" step="any" placeholder="Target Value" className="input" value={formData.target_value} onChange={e => setFormData({...formData, target_value: e.target.value})} required />
              <input type="number" min="10" max="100" placeholder="Weightage % (10-100)" className="input" value={formData.weightage} onChange={e => setFormData({...formData, weightage: parseInt(e.target.value)})} required />
              <input type="date" className="input" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingGoal(null); setFormData(initialForm); }} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;