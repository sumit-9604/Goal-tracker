import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import api from './api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reportData, setReportData] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    try {
      const res = await api.get('/reports/export');
      setReportData(res.data);
      const deptMap = {};
      res.data.forEach(item => {
        if (!deptMap[item.department]) deptMap[item.department] = { total: 0, count: 0 };
        deptMap[item.department].total += item.progress_percent || 0;
        deptMap[item.department].count++;
      });
      const chart = Object.keys(deptMap).map(dept => ({
        department: dept,
        avgProgress: (deptMap[dept].total / deptMap[dept].count).toFixed(1)
      }));
      setChartData(chart);
    } catch (err) { console.error(err); }
  };

  const exportCSV = () => {
    if (!reportData.length) return;
    const headers = Object.keys(reportData[0]);
    const csvRows = [headers.join(',')];
    for (const row of reportData) {
      const values = headers.map(header => JSON.stringify(row[header] || ''));
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goal_report_${new Date().toISOString().slice(0,10)}.csv`;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Average Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="department" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Bar dataKey="avgProgress" fill="#6366f1" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 overflow-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Goal Details</h3>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 text-left font-semibold">Employee</th>
                <th className="p-3 text-left font-semibold">Goal</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {reportData.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3">{row.employee_name}</td>
                  <td className="p-3">{row.title}</td>
                  <td className="p-3 capitalize">{row.status}</td>
                  <td className="p-3">{row.progress_percent || 0}%</td>
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