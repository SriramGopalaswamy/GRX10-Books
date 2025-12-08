import React from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { HRMSRole as Role } from '../../../shared/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Calendar, TrendingUp, Users, AlertCircle } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock Data for Charts
  const attendanceData = [
    { name: 'Mon', hours: 8.5 },
    { name: 'Tue', hours: 9.2 },
    { name: 'Wed', hours: 8.8 },
    { name: 'Thu', hours: 9.5 },
    { name: 'Fri', hours: 7.5 },
  ];

  const leaveDistribution = [
    { name: 'Sick', value: 5 },
    { name: 'Casual', value: 8 },
    { name: 'Earned', value: 3 },
  ];
  const COLORS = ['#ef4444', '#3b82f6', '#10b981'];

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back, {user.name.split(' ')[0]} 👋</h2>
        <p className="text-slate-500">Here's what's happening today.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Avg. Work Hours" 
          value="8h 45m" 
          icon={<Clock size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Leave Balance" 
          value="18 Days" 
          icon={<Calendar size={24} />} 
          color="bg-emerald-500" 
        />
        {user.role === Role.HR || user.role === Role.ADMIN ? (
          <>
            <StatCard 
              title="Total Employees" 
              value="104" 
              icon={<Users size={24} />} 
              color="bg-indigo-500" 
            />
            <StatCard 
              title="Attrition Rate" 
              value="2.4%" 
              icon={<TrendingUp size={24} />} 
              color="bg-rose-500" 
            />
          </>
        ) : (
           <>
            <StatCard 
              title="Next Holiday" 
              value="Nov 14" 
              icon={<TrendingUp size={24} />} 
              color="bg-indigo-500" 
            />
            <StatCard 
              title="Pending Tasks" 
              value="3" 
              icon={<AlertCircle size={24} />} 
              color="bg-orange-500" 
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Weekly Attendance Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Chart or Team Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Leave Balance Distribution</h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
             {leaveDistribution.map((entry, index) => (
               <div key={index} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                 <span className="text-sm text-slate-600">{entry.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};