
import React, { useMemo } from 'react';
import { useStore } from '../../../shared/contexts/StoreContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { GoalStatus } from '../../../shared/types';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

export const Dashboard: React.FC = () => {
  const { goals, memos } = useStore();

  const stats = useMemo(() => {
    const totalGoals = goals.length;
    const completed = goals.filter(g => g.status === GoalStatus.COMPLETED).length;
    const onTrack = goals.filter(g => g.status === GoalStatus.ON_TRACK).length;
    const atRisk = goals.filter(g => g.status === GoalStatus.AT_RISK).length;
    const offTrack = goals.filter(g => g.status === GoalStatus.OFF_TRACK).length;

    return { totalGoals, completed, onTrack, atRisk, offTrack };
  }, [goals]);

  const completionRate = stats.totalGoals ? Math.round(((stats.completed + stats.onTrack) / stats.totalGoals) * 100) : 0;

  const dataStatus = [
    { name: 'On Track', value: stats.onTrack },
    { name: 'At Risk', value: stats.atRisk },
    { name: 'Off Track', value: stats.offTrack },
    { name: 'Completed', value: stats.completed },
  ];

  // Mock Trend Data
  const dataTrend = [
    { name: 'Q1', revenue: 4000, target: 4200 },
    { name: 'Q2', revenue: 5100, target: 4800 },
    { name: 'Q3', revenue: 6200, target: 6500 },
    { name: 'Q4', revenue: 5800, target: 7000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time performance snapshot for GRX10.</p>
        </div>
        <div className="text-right">
            <p className="text-sm text-gray-500">Current Quarter</p>
            <p className="text-2xl font-bold text-brand-600">Q3 2024</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Goal Completion */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm font-medium text-gray-500">Goal Completion</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{completionRate}%</p>
             </div>
             <div className={`p-2 rounded-lg ${completionRate >= 80 ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                 <TrendingUp size={20} />
             </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>

        {/* CAC */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm font-medium text-gray-500">CAC</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">$142</p>
             </div>
             <div className="p-2 rounded-lg bg-green-50 text-green-600">
                 <TrendingDown size={20} />
             </div>
          </div>
          <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
             <TrendingDown size={12} /> 12% vs last quarter
          </p>
        </div>

        {/* Solar Installation Rate */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm font-medium text-gray-500">Install Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">18<span className="text-sm text-gray-400 font-normal">/wk</span></p>
             </div>
             <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                 <Zap size={20} />
             </div>
          </div>
           <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
             <TrendingUp size={12} /> 5% vs target
          </p>
        </div>

        {/* Average Deal Size */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm font-medium text-gray-500">Avg Deal Size</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">$8.5k</p>
             </div>
             <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                 <Minus size={20} />
             </div>
          </div>
           <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
             Flat vs last month
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Goal Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-sm text-gray-600">
             {dataStatus.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                   {d.name}: {d.value}
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue: Actual vs Target (k$)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Actual" />
                <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
