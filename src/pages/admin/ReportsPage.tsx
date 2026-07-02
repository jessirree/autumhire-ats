import { useEffect, useMemo, useState } from 'react';
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
import { Application, getAllApplications } from '../../services/applicationService';
import { Interview, getInterviews } from '../../services/interviewService';
import { Job, getJobs } from '../../services/jobService';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

const DATE_RANGE_DAYS: Record<string, number | null> = {
  'last-30-days': 30,
  'last-3-months': 91,
  'last-6-months': 182,
  'last-year': 365,
  'all-time': null,
};

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('last-6-months');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    Promise.all([getAllApplications(), getInterviews(), getJobs()])
      .then(([apps, ivs, jobList]) => {
        setAllApplications(apps);
        setInterviews(ivs);
        setJobs(jobList);
      })
      .catch((err) => console.error('Failed to load report data', err));
  }, []);

  // Apply date-range + department filters.
  const applications = useMemo(() => {
    const days = DATE_RANGE_DAYS[dateRange] ?? null;
    const cutoff = days ? Date.now() - days * 86400000 : null;
    return allApplications.filter((a) => {
      const inRange = !cutoff || (a.appliedAt?.toDate ? a.appliedAt.toDate().getTime() >= cutoff : true);
      const inDept =
        departmentFilter === 'all' || a.department.toLowerCase() === departmentFilter.toLowerCase();
      return inRange && inDept;
    });
  }, [allApplications, dateRange, departmentFilter]);

  const hired = applications.filter((a) => a.status === 'hired');
  const departments = Array.from(new Set(allApplications.map((a) => a.department).filter(Boolean)));

  // ── Report datasets (computed from real data) ─────────────────────

  const genderData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      const g = a.gender ? a.gender.charAt(0).toUpperCase() + a.gender.slice(1) : 'Not specified';
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [applications]);

  const ageData = useMemo(() => {
    const buckets = [
      { range: '18-24', min: 18, max: 24, count: 0 },
      { range: '25-29', min: 25, max: 29, count: 0 },
      { range: '30-40', min: 30, max: 40, count: 0 },
      { range: '40-50', min: 41, max: 50, count: 0 },
      { range: '50-60', min: 51, max: 60, count: 0 },
      { range: '60+', min: 61, max: 200, count: 0 },
    ];
    for (const a of applications) {
      const age = ageFromDob(a.dateOfBirth);
      if (age === null) continue;
      const bucket = buckets.find((b) => age >= b.min && age <= b.max);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [applications]);

  const sourceData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      const s = a.source || 'unknown';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([source, hires], i) => ({
      source,
      hires,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [applications]);

  const departmentData = useMemo(() => {
    return departments.map((department) => {
      const apps = applications.filter((a) => a.department === department);
      return {
        department,
        applications: apps.length,
        interviews: apps.filter((a) => ['interview', 'offer', 'hired'].includes(a.status)).length,
        hires: apps.filter((a) => a.status === 'hired').length,
      };
    });
  }, [applications, departments]);

  // Average days from application to hire, per hire month.
  const timeToFillData = useMemo(() => {
    const byMonth = new Map<string, { total: number; n: number }>();
    for (const a of hired) {
      if (!a.appliedAt?.toDate || !a.updatedAt?.toDate) continue;
      const days = (a.updatedAt.toDate().getTime() - a.appliedAt.toDate().getTime()) / 86400000;
      const month = a.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const entry = byMonth.get(month) ?? { total: 0, n: 0 };
      entry.total += days;
      entry.n += 1;
      byMonth.set(month, entry);
    }
    return Array.from(byMonth.entries()).map(([month, { total, n }]) => ({
      month,
      days: Math.round(total / n),
    }));
  }, [hired]);

  const avgTimeToHire = timeToFillData.length
    ? `${Math.round(timeToFillData.reduce((s, d) => s + d.days, 0) / timeToFillData.length)} days`
    : '—';

  const offersMade = applications.filter((a) => ['offer', 'hired'].includes(a.status)).length;
  const offerAcceptRate = offersMade ? `${Math.round((hired.length / offersMade) * 100)}%` : '—';
  const internalHireRatio = hired.length
    ? `${Math.round((hired.filter((a) => a.isInternal).length / hired.length) * 100)}%`
    : '—';
  const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled').length;

  // Cost metrics from per-job recruitment costs.
  const hiredJobIds = new Set(hired.map((a) => a.jobId));
  const costOfHiringJobs = jobs
    .filter((j) => hiredJobIds.has(j.id) && j.recruitmentCost)
    .reduce((sum, j) => sum + (j.recruitmentCost ?? 0), 0);
  const costPerHire = hired.length && costOfHiringJobs
    ? `KES ${Math.round(costOfHiringJobs / hired.length).toLocaleString()}`
    : '—';
  const vacancyCosts = jobs
    .filter((j) => (j.status === 'Active' || j.status === 'Re-advertised') && j.recruitmentCost)
    .reduce((sum, j) => sum + (j.recruitmentCost ?? 0), 0);

  const exportReport = () => {
    const headers = ['Department', 'Applications', 'Interviews', 'Hires'];
    const rows = departmentData.map((d) => [d.department, d.applications, d.interviews, d.hires]);
    const summary = [
      [],
      ['Total hires', hired.length],
      ['Avg time to hire', avgTimeToHire],
      ['Offer accept rate', offerAcceptRate],
      ['Internal hire ratio', internalHireRatio],
      ['Scheduled interviews', scheduledInterviews],
    ];
    const csv = [headers, ...rows, ...summary].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruitment-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Recruitment Analytics</h1>
          <p className="text-gray-600">Insights and metrics on your hiring performance</p>
        </div>
        <Button variant="outline" onClick={exportReport}>
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
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Hires</p>
          <p className="text-3xl font-semibold">{hired.length}</p>
          <p className="text-sm text-gray-500 mt-2">{applications.length} applications in period</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg. Time to Hire</p>
          <p className="text-3xl font-semibold">{avgTimeToHire}</p>
          <p className="text-sm text-gray-500 mt-2">From application to hire</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Cost per Hire</p>
          <p className="text-3xl font-semibold">{costPerHire}</p>
          <p className="text-sm text-gray-500 mt-2">
            Internal hire ratio: {internalHireRatio} • Open vacancy costs: {vacancyCosts ? `KES ${vacancyCosts.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Offer Accept Rate</p>
          <p className="text-3xl font-semibold">{offerAcceptRate}</p>
          <p className="text-sm text-gray-500 mt-2">{scheduledInterviews} interviews scheduled</p>
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

      {/* Nationality breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Applicants by Nationality</h3>
        <div className="space-y-3">
          {Object.entries(
            applications.reduce<Record<string, number>>((acc, a) => {
              const n = a.nationality || 'Not specified';
              acc[n] = (acc[n] ?? 0) + 1;
              return acc;
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([nationality, count]) => {
              const pct = applications.length ? Math.round((count / applications.length) * 100) : 0;
              return (
                <div key={nationality} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{nationality}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          {applications.length === 0 && <p className="text-sm text-gray-500">No application data yet.</p>}
        </div>
      </div>
    </div>
  );
}

