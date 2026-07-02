import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const genderData = [
  { name: 'Male', value: 45, color: '#3b82f6' },
  { name: 'Female', value: 42, color: '#8b5cf6' },
  { name: 'Other', value: 8, color: '#10b981' },
  { name: 'Not specified', value: 5, color: '#6b7280' },
];

const ageData = [
  { range: '18-24', count: 12 },
  { range: '25-34', count: 45 },
  { range: '35-44', count: 32 },
  { range: '45-54', count: 18 },
  { range: '55+', count: 8 },
];

const sourceData = [
  { source: 'LinkedIn', hires: 28, color: '#3b82f6' },
  { source: 'Company Website', hires: 18, color: '#8b5cf6' },
  { source: 'Job Boards', hires: 15, color: '#10b981' },
  { source: 'Referrals', hires: 22, color: '#f59e0b' },
  { source: 'Recruiters', hires: 12, color: '#ef4444' },
];

const departmentData = [
  { department: 'Engineering', applications: 156, interviews: 42, hires: 8 },
  { department: 'Product', applications: 98, interviews: 28, hires: 5 },
  { department: 'Design', applications: 78, interviews: 24, hires: 4 },
  { department: 'Marketing', applications: 65, interviews: 18, hires: 3 },
  { department: 'Sales', applications: 54, interviews: 15, hires: 2 },
];

const timeToFillData = [
  { month: 'Jan', days: 28 },
  { month: 'Feb', days: 25 },
  { month: 'Mar', days: 22 },
  { month: 'Apr', days: 24 },
  { month: 'May', days: 21 },
  { month: 'Jun', days: 19 },
];

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('last-6-months');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Recruitment Analytics</h1>
          <p className="text-gray-600">Insights and metrics on your hiring performance</p>
        </div>
        <Button variant="outline">
          <Download className="size-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="engineering">Engineering</option>
            <option value="product">Product</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="sales">Sales</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Hires</p>
          <p className="text-3xl font-semibold">22</p>
          <p className="text-sm text-green-600 mt-2">â†‘ 15% from last period</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg. Time to Hire</p>
          <p className="text-3xl font-semibold">23 days</p>
          <p className="text-sm text-green-600 mt-2">â†“ 3 days improvement</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Cost per Hire</p>
          <p className="text-3xl font-semibold">$4,250</p>
          <p className="text-sm text-green-600 mt-2">â†“ 8% reduction</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Offer Accept Rate</p>
          <p className="text-3xl font-semibold">89%</p>
          <p className="text-sm text-green-600 mt-2">â†‘ 4% increase</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Source of Hire</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="hires" radius={[0, 4, 4, 0]}>
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Time to Fill Position (Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeToFillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="days" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hiring Funnel by Department */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-6">Hiring Funnel by Department</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={departmentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="department" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Applications" />
            <Bar dataKey="interviews" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Interviews" />
            <Bar dataKey="hires" fill="#10b981" radius={[4, 4, 0, 0]} name="Hires" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost per Hire Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Cost per Hire Breakdown</h3>
        <div className="space-y-3">
          {[
            { category: 'Job Board Postings', amount: '$1,200', percentage: 28 },
            { category: 'Recruitment Agency Fees', amount: '$1,500', percentage: 35 },
            { category: 'Background Checks', amount: '$450', percentage: 11 },
            { category: 'Interview & Assessment Tools', amount: '$600', percentage: 14 },
            { category: 'Other Expenses', amount: '$500', percentage: 12 },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="text-sm font-semibold">{item.amount}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

