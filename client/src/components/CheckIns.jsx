import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import api from './api';
import toast from 'react-hot-toast';

const CheckIns = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [progressInputs, setProgressInputs] = useState({});
  const [feedback, setFeedback] = useState({});
  const currentQuarter = `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      const endpoint = user.role === 'employee' ? '/goals/my' : '/goals/team';
      const res = await api.get(endpoint);
      const active = res.data.filter(g => g.status === 'approved' || g.status === 'locked');
      setGoals(active);
      const initial = {};
      active.forEach(g => { initial[g.id] = { achievement: g.actual_value ?? '', status: 'on_track' }; });
      setProgressInputs(initial);
    } catch (err) { toast.error('Failed to load goals'); }
  };

  const handleProgressChange = (goalId, field, value) => {
    setProgressInputs(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  };

  const updateProgress = async (goalId) => {
    const input = progressInputs[goalId];
    if (input?.achievement === '' || input?.achievement == null) {
      toast.error('Please enter an achievement value');
      return;
    }
    try {
      await api.post(`/progress/${goalId}`, {
        quarter: currentQuarter,
        achievement: parseFloat(input.achievement),
        status: input.status,
      });
      toast.success('Progress updated');
      loadGoals();
    } catch (err) { toast.error('Update failed'); }
  };

  const submitFeedback = async (goalId, feedbackText) => {
    if (!feedbackText?.trim()) {
      toast.error('Please enter feedback before submitting');
      return;
    }
    try {
      await api.post(`/progress/${goalId}/feedback`, { quarter: currentQuarter, feedback: feedbackText });
      toast.success('Feedback saved');
      setFeedback(prev => ({ ...prev, [goalId]: '' }));
    } catch (err) { toast.error('Failed to save feedback'); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent mb-2">
        Quarterly Check-ins
      </h1>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-xl">
        <p className="font-semibold">Current Check-in Window: {currentQuarter}</p>
        <p className="text-sm">
          {user.role === 'employee'
            ? 'Update your achievements for the quarter. Managers can provide feedback.'
            : "Review your team's progress and add feedback for each goal."}
        </p>
      </div>

      {goals.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          {user.role === 'employee'
            ? 'No approved goals found. Goals must be approved before you can check in.'
            : 'No active team goals found for check-ins.'}
        </div>
      )}

      <div className="space-y-6">
        {goals.map(goal => (
          <div key={goal.id} className="card p-5">
            {user.role !== 'employee' && goal.employee_name && (
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">{goal.employee_name}</p>
            )}
            <h3 className="font-bold text-lg">{goal.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium">Target:</span> {goal.target_value} ({goal.uom_type})</div>
              <div><span className="font-medium">Weightage:</span> {goal.weightage}%</div>
              <div><span className="font-medium">Current Achievement:</span> {goal.actual_value != null ? goal.actual_value : '—'}</div>
              <div><span className={`text-xs px-2 py-1 rounded ${goal.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{goal.status}</span></div>
            </div>

            {user.role === 'employee' && (
              <div className="border-t pt-4 mt-3">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Achievement</label>
                    <input
                      type="number"
                      placeholder="Enter value"
                      className="input"
                      value={progressInputs[goal.id]?.achievement ?? ''}
                      onChange={e => handleProgressChange(goal.id, 'achievement', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      className="input"
                      value={progressInputs[goal.id]?.status ?? 'on_track'}
                      onChange={e => handleProgressChange(goal.id, 'status', e.target.value)}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="on_track">On Track</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <button onClick={() => updateProgress(goal.id)} className="btn-primary">
                    Save
                  </button>
                </div>
              </div>
            )}

            {(user.role === 'manager' || user.role === 'admin') && (
              <div className="mt-3 border-t pt-3">
                <label className="block text-sm font-medium mb-1">Manager Feedback</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    className="flex-1 input"
                    rows="2"
                    placeholder="Add feedback on progress..."
                    value={feedback[goal.id] || ''}
                    onChange={e => setFeedback(prev => ({ ...prev, [goal.id]: e.target.value }))}
                  />
                  <button onClick={() => submitFeedback(goal.id, feedback[goal.id])} className="btn-primary whitespace-nowrap">
                    Send Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckIns;