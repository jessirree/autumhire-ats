import { Briefcase, Users, Clock, TrendingUp } from 'lucide-react';
import { StatsCard } from '../../components/ats/StatsCard';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const hiringFunnelData = [
  { stage: 'Applied', count: 245 },
  { stage: 'Screening', count: 178 },
  { stage: 'Shortlist', count: 89 },
  { stage: 'Interview', count: 45 },
  { stage: 'Offer', count: 12 },
  { stage: 'Hired', count: 8 },
];

const recentApplications = [
  { id: '1', candidate: 'Sarah Johnson', job: 'Senior Frontend Developer', date: '2 hours ago', status: 'new' },
  { id: '2', candidate: 'Michael Chen', job: 'Product Manager', date: '4 hours ago', status: 'screening' },
  { id: '3', candidate: 'Emma Williams', job: 'UX Designer', date: '5 hours ago', status: 'new' },
  { id: '4', candidate: 'James Brown', job: 'Data Analyst', date: '1 day ago', status: 'shortlisted' },
  { id: '5', candidate: 'Lisa Anderson', job: 'DevOps Engineer', date: '1 day ago', status: 'interview' },
];

const jobsClosingSoon = [
  { id: '1', title: 'Senior Frontend Developer', daysLeft: 3, applicants: 45 },
  { id: '2', title: 'Product Manager', daysLeft: 5, applicants: 78 },
  { id: '3', title: 'UX Designer', daysLeft: 7, applicants: 62 },
];

export function RecruiterDashboard() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your recruitment activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        <StatsCard
          title="Active Jobs"
          value="24"
          icon={Briefcase}
          trend={{ value: '+3 this month', isPositive: true }}
          color="blue"
        />
        <StatsCard
          title="Total Applicants"
          value="245"
          icon={Users}
          trend={{ value: '+28 this week', isPositive: true }}
          color="purple"
        />
        <StatsCard
          title="Interviews Scheduled"
          value="18"
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Avg. Time to Hire"
          value="24 days"
          icon={TrendingUp}
          trend={{ value: '-3 days', isPositive: true }}
          color="green"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hiring Funnel */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Hiring Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hiringFunnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs Closing Soon */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Jobs Closing Soon</h3>
          <div className="space-y-4">
            {jobsClosingSoon.map((job) => (
              <div key={job.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <p className="font-medium text-sm mb-2">{job.title}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className={job.daysLeft <= 3 ? 'text-red-600 font-medium' : ''}>
                    {job.daysLeft} days left
                  </span>
                  <span>{job.applicants} applicants</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold">Recent Applications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {app.candidate.charAt(0)}
                      </div>
                      <span className="font-medium">{app.candidate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{app.job}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{app.date}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

