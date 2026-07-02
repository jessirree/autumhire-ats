import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Clock, TrendingUp } from 'lucide-react';
import { StatsCard } from '../../components/ats/StatsCard';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Job, getJobs, isPastDeadline } from '../../services/jobService';
import { Application, getAllApplications } from '../../services/applicationService';
import { Interview, getInterviews } from '../../services/interviewService';

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

/** Average days from application to hire, across hired candidates. */
function avgTimeToHire(applications: Application[]): string {
  const hired = applications.filter((a) => a.status === 'hired' && a.appliedAt?.toDate && a.updatedAt?.toDate);
  if (!hired.length) return '—';
  const totalDays = hired.reduce(
    (sum, a) => sum + (a.updatedAt!.toDate().getTime() - a.appliedAt!.toDate().getTime()) / 86400000,
    0
  );
  return `${Math.round(totalDays / hired.length)} days`;
}

export function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    Promise.all([getJobs(), getAllApplications(), getInterviews()])
      .then(([j, a, i]) => {
        setJobs(j);
        setApplications(a);
        setInterviews(i);
      })
      .catch((err) => console.error('Failed to load dashboard', err));
  }, []);

  const activeJobs = jobs.filter((j) => j.status === 'Active' || j.status === 'Re-advertised');

  const hiringFunnelData = useMemo(() => {
    const count = (statuses: string[]) => applications.filter((a) => statuses.includes(a.status)).length;
    return [
      { stage: 'Applied', count: applications.length },
      { stage: 'Longlist', count: count(['longlisted', 'shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Shortlist', count: count(['shortlisted', 'interview', 'offer', 'hired']) },
      { stage: 'Interview', count: count(['interview', 'offer', 'hired']) },
      { stage: 'Offer', count: count(['offer', 'hired']) },
      { stage: 'Hired', count: count(['hired']) },
    ];
  }, [applications]);

  const recentApplications = applications.slice(0, 5);

  const jobsClosingSoon = activeJobs
    .filter((j) => j.closingDate && !isPastDeadline(j))
    .map((j) => ({
      id: j.id,
      title: j.title,
      daysLeft: daysUntil(j.closingDate!),
      applicants: applications.filter((a) => a.jobId === j.id).length,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your recruitment activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        <StatsCard title="Active Jobs" value={String(activeJobs.length)} icon={Briefcase} color="blue" />
        <StatsCard title="Total Applicants" value={String(applications.length)} icon={Users} color="purple" />
        <StatsCard
          title="Interviews Scheduled"
          value={String(interviews.filter((i) => i.status === 'scheduled').length)}
          icon={Clock}
          color="amber"
        />
        <StatsCard title="Avg. Time to Hire" value={avgTimeToHire(applications)} icon={TrendingUp} color="green" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hiring Funnel */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-6">Hiring Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hiringFunnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs Closing Soon */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Jobs Closing Soon</h3>
          <div className="space-y-4">
            {jobsClosingSoon.length === 0 && <p className="text-sm text-gray-500">No deadlines approaching.</p>}
            {jobsClosingSoon.map((job) => (
              <div key={job.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <p className="font-medium text-sm mb-2">{job.title}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className={job.daysLeft <= 3 ? 'text-red-600 font-medium' : ''}>
                    {job.daysLeft} day{job.daysLeft !== 1 ? 's' : ''} left
                  </span>
                  <span>{job.applicants} applicant{job.applicants !== 1 ? 's' : ''}</span>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentApplications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No applications yet.</td>
                </tr>
              )}
              {recentApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {app.candidateName.charAt(0)}
                      </div>
                      <span className="font-medium">{app.candidateName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{app.jobTitle}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {app.appliedAt?.toDate ? timeAgo(app.appliedAt.toDate()) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => navigate(`/recruiter/candidate-detail/${app.id}`)}
                    >
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
