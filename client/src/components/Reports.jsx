import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import api from './api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Download, TrendingUp, Users, Target, CheckCircle } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reportData, setReportData] = useState([]);
  const [deptChart, setDeptChart] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [uomChart, setUomChart] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    try {
      const res = await api.get('/reports/export');
      const data = res.data;
      setReportData(data);

      // Department avg progress
      const deptMap = {};
      data.forEach(item => {
        if (!deptMap[item.department]) deptMap[item.department] = { total: 0, count: 0 };
        deptMap[item.department].total += parseFloat(item.progress_percent) || 0;
        deptMap[item.department].count++;
      });
      setDeptChart(Object.keys(deptMap).map(dept => ({
        department: dept || 'Unknown',
        avgProgress: parseFloat((deptMap[dept].total / deptMap[dept].count).toFixed(1))
      })));

      // Status distribution
      const statusMap = {};
      data.forEach(item => {
        statusMap[item.status] = (statusMap[item.status] || 0) + 1;
      });
      setStatusChart(Object.keys(statusMap).map(s => ({ name: s, value: statusMap[s] })));

      // UoM distribution
      const uomMap = {};
      data.forEach(item => {
        uomMap[item.uom_type] = (uomMap[item.uom_type] || 0) + 1;
      });
      setUomChart(Object.keys(uomMap).map(u => ({ name: u, value: uomMap[u] })));

      // Summary stats
      setSummaryStats({
        total: data.length,
        approved: data.filter(d => d.status === 'approved').length,
        avgProgress: data.length
          ? (data.reduce((s, d) => s + (parseFloat(d.progress_percent) || 0), 0) / data.length).toFixed(1)
          : 0,
        completed: data.filter(d => parseFloat(d.progress_percent) >= 100).length
      });
    } catch (err) { console.error(err); }
  };

  const exportCSV = () => {
    if (!reportData.length) return;
    const headers = ['Employee', 'Department', 'Goal', 'Status', 'Weightage', 'Progress %', 'Feedback'];
    const rows = reportData.map(r => [
      r.employee_name, r.department, r.title, r.status,
      r.weightage, r.progress_percent || 0, r.manager_feedback || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goal_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
          Analytics & Reports
        </h1>
        <button onClick={exportCSV} className="btn-success flex items-center gap-2">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Goals', value: summaryStats.total || 0, icon: Target, color: 'from-blue-500 to-cyan-500' },
          { label: 'Approved', value: summaryStats.approved || 0, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
          { label: 'Avg Progress', value: `${summaryStats.avgProgress || 0}%`, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
          { label: '100% Achieved', value: summaryStats.completed || 0, icon: Users, color: 'from-amber-500 to-orange-500' },
        ].map((card, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className={`bg-gradient-to-br ${card.color} p-3 rounded-xl`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Average Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="department" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="avgProgress" fill="#6366f1" radius={[8, 8, 0, 0]} name="Avg Progress %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Goal Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusChart} cx="50%" cy="50%" outerRadius={90}
                dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Goal Distribution by UoM Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={uomChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Planned vs Actual Table */}
        <div className="card p-6 overflow-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Planned vs Actual Achievement</h3>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Goal</th>
                <th className="p-2 text-right">Progress</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-2">{row.employee_name}</td>
                  <td className="p-2 max-w-[150px] truncate">{row.title}</td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(row.progress_percent || 0, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium">{row.progress_percent || 0}%</span>
                    </div>
                  </td>
                  <td className="p-2 capitalize text-xs">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;