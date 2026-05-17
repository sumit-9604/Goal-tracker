import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import api from "./api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Target, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [trend, setTrend] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/reports/dashboard");
      setStats(res.data.stats);
      setTrend(res.data.trend || []);
      setActivities(res.data.activities || []);
    } catch (err) { console.error(err); }
  };

  const getStatCards = () => {
    if (user?.role === "employee") {
      return [
        { title: "Total Goals", value: stats.total_goals || 0, icon: Target, color: "from-blue-500 to-cyan-500" },
        { title: "Approved", value: stats.approved || 0, icon: CheckCircle, color: "from-emerald-500 to-teal-500" },
        { title: "Locked", value: stats.locked || 0, icon: Clock, color: "from-gray-500 to-slate-500" },
        { title: "Avg Achievement", value: stats.avg_achievement ? parseFloat(stats.avg_achievement).toFixed(1) : "—", icon: TrendingUp, color: "from-amber-500 to-orange-500" },
      ];
    }
    if (user?.role === "manager") {
      return [
        { title: "Team Goals", value: stats.total_goals || 0, icon: Target, color: "from-blue-500 to-cyan-500" },
        { title: "Approved", value: stats.approved || 0, icon: CheckCircle, color: "from-emerald-500 to-teal-500" },
        { title: "Pending Approval", value: stats.pending_approval || 0, icon: Clock, color: "from-purple-500 to-pink-500" },
      ];
    }
    // admin
    return [
      { title: "Total Goals", value: stats.total_goals || 0, icon: Target, color: "from-blue-500 to-cyan-500" },
      { title: "Employees", value: stats.employees || 0, icon: Users, color: "from-emerald-500 to-teal-500" },
      { title: "Pending Approval", value: stats.pending_approval || 0, icon: Clock, color: "from-purple-500 to-pink-500" },
    ];
  };

  const statCards = getStatCards();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.full_name} 👋</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="card card-hover p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`bg-gradient-to-br ${card.color} p-3 rounded-2xl shadow-md`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="achieved" stroke="#6366f1" strokeWidth={2} name="Achieved %" />
                <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Target %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No progress data yet</div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {activities.length > 0 ? (
              activities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{act.action} — {act.entity_type}</p>
                    <p className="text-xs text-gray-400">{act.user_name} · {act.created_at ? new Date(act.created_at).toLocaleString() : "No date"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;