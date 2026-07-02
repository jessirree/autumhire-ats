import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { Search, Filter, Plus, Users, CalendarDays, ExternalLink, Briefcase, RefreshCw, XCircle, Share2, Rss, Linkedin, Copy, MessageCircle } from 'lucide-react';
import {
  regenerateJobsFeed,
  jobPublicUrl,
  linkedInShareUrl,
  twitterShareUrl,
  whatsAppShareUrl,
} from '../../services/feedService';
import { Job, getJobs, closeJob, reopenJob } from '../../services/jobService';
import { Application, getAllApplications } from '../../services/applicationService';
import { useAuth } from '../../context/AuthContext';

interface JobAdvertsPageProps {
  onViewApplications: (jobId: string) => void;
  onCreateAdvert: () => void;
}

interface PipelineStats {
  total: number;
  longlisted: number;
  shortlisted: number;
  interviewed: number;
  rejected: number;
}

function statsForJob(jobId: string, applications: Application[]): PipelineStats {
  const apps = applications.filter((a) => a.jobId === jobId);
  return {
    total: apps.length,
    longlisted: apps.filter((a) => a.status === 'longlisted').length,
    shortlisted: apps.filter((a) => a.status === 'shortlisted').length,
    interviewed: apps.filter((a) => a.status === 'interview').length,
    rejected: apps.filter((a) => a.status === 'rejected' || a.status === 'regretted').length,
  };
}

export function JobAdvertsPage({ onViewApplications, onCreateAdvert }: JobAdvertsPageProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareJobId, setShareJobId] = useState<string | null>(null);
  const [feedBusy, setFeedBusy] = useState(false);

  const handleRssFeed = async () => {
    setFeedBusy(true);
    try {
      const url = await regenerateJobsFeed();
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`RSS feed updated and URL copied to clipboard:\n${url}\n\nPaste it into LinkedIn/X automation tools or any RSS reader.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate feed.');
    } finally {
      setFeedBusy(false);
    }
  };

  const handleCopyLink = async (job: Job) => {
    await navigator.clipboard.writeText(jobPublicUrl(job.id)).catch(() => {});
    setShareJobId(null);
    alert('Public link copied to clipboard.');
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobList, appList] = await Promise.all([getJobs(), getAllApplications()]);
      setJobs(jobList);
      setApplications(appList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load job adverts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleClose = async (job: Job) => {
    if (!user) return;
    if (!confirm(`Close "${job.title}"? Candidates will no longer be able to apply.`)) return;
    await closeJob(job.id, user);
    regenerateJobsFeed().catch(() => {});
    load();
  };

  const handleReopen = async (job: Job) => {
    if (!user) return;
    const newDate = prompt('New closing date (YYYY-MM-DD), or leave blank to keep none:', '');
    await reopenJob(job.id, newDate || undefined, user);
    regenerateJobsFeed().catch(() => {});
    load();
  };

  const filteredAdverts = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || job.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Job Adverts</h1>
          <p className="text-gray-500">Manage your published job postings and their visibility.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" disabled={feedBusy} onClick={handleRssFeed}>
            <Rss className="size-4" />
            {feedBusy ? 'Generating…' : 'RSS Feed'}
          </Button>
          <Button
            onClick={onCreateAdvert}
            className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl"
          >
            <Plus className="size-4" />
            Create Advert
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search adverts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary appearance-none bg-white font-medium text-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="re-advertised">Re-advertised</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline Stats</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hiring Team</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Closing Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading adverts…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500">{error}</td>
                </tr>
              )}
              {!loading && !error && filteredAdverts.map((job) => {
                const stats = statsForJob(job.id, applications);
                return (
                  <tr key={job.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          {job.title}
                          {job.isConfidential && <span className="ml-2 text-[10px] uppercase text-purple-600 font-bold">Confidential</span>}
                          {job.advertType === 'internal' && <span className="ml-2 text-[10px] uppercase text-blue-600 font-bold">Internal</span>}
                        </span>
                        <span className="text-xs text-gray-500">{job.referenceNumber} • {job.location || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4 text-xs mt-1">
                        <div className="flex flex-col items-center" title="Total Applications"><span className="font-semibold text-gray-700">{stats.total}</span><span className="text-gray-400 text-[10px] uppercase">Total</span></div>
                        <div className="flex flex-col items-center" title="Longlisted"><span className="font-semibold text-blue-600">{stats.longlisted}</span><span className="text-gray-400 text-[10px] uppercase">Long</span></div>
                        <div className="flex flex-col items-center" title="Shortlisted"><span className="font-semibold text-amber-500">{stats.shortlisted}</span><span className="text-gray-400 text-[10px] uppercase">Short</span></div>
                        <div className="flex flex-col items-center" title="Interviewed"><span className="font-semibold text-purple-600">{stats.interviewed}</span><span className="text-gray-400 text-[10px] uppercase">Int</span></div>
                        <div className="flex flex-col items-center" title="Rejected"><span className="font-semibold text-red-500">{stats.rejected}</span><span className="text-gray-400 text-[10px] uppercase">Rej</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {(job.hiringTeam || []).map((member, idx) => (
                          <div
                            key={idx}
                            className="size-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-xs font-bold text-autumn-charcoal"
                            title={`${member.role}: ${member.name}`}
                          >
                            {member.name.charAt(0)}
                          </div>
                        ))}
                        {(job.hiringTeam || []).length === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={job.status.toLowerCase()} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDays className="size-4 text-gray-400" />
                        {job.closingDate || 'No deadline'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2 border-gray-200 hover:bg-gray-50 hover:text-autumn-primary"
                          onClick={() => onViewApplications(job.id)}
                        >
                          <Users className="size-4" />
                          Applications
                        </Button>
                        {(job.status === 'Active' || job.status === 'Re-advertised') && (
                          <button
                            onClick={() => handleClose(job)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                            title="Close advert"
                          >
                            <XCircle className="size-4" />
                          </button>
                        )}
                        {job.status === 'Closed' && (
                          <button
                            onClick={() => handleReopen(job)}
                            className="text-gray-400 hover:text-green-600 transition-colors p-1.5 rounded-lg hover:bg-green-50"
                            title="Re-open (re-advertise)"
                          >
                            <RefreshCw className="size-4" />
                          </button>
                        )}
                        {(job.status === 'Active' || job.status === 'Re-advertised') && job.advertType === 'external' && (
                          <div className="relative">
                            <button
                              onClick={() => setShareJobId(shareJobId === job.id ? null : job.id)}
                              className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                              title="Share advert"
                            >
                              <Share2 className="size-4" />
                            </button>
                            {shareJobId === job.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 w-44 text-left">
                                <a href={linkedInShareUrl(job.id)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShareJobId(null)}>
                                  <Linkedin className="size-4 text-blue-600" /> LinkedIn
                                </a>
                                <a href={twitterShareUrl(job)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShareJobId(null)}>
                                  <Share2 className="size-4 text-gray-800" /> X / Twitter
                                </a>
                                <a href={whatsAppShareUrl(job)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShareJobId(null)}>
                                  <MessageCircle className="size-4 text-green-600" /> WhatsApp
                                </a>
                                <button onClick={() => handleCopyLink(job)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Copy className="size-4 text-gray-500" /> Copy link
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <a
                          href={`/jobs/${job.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-autumn-primary transition-colors p-1.5 rounded-lg hover:bg-orange-50"
                          title="View public page"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !error && filteredAdverts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Briefcase className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No job adverts found</p>
                    <p className="text-sm text-gray-500 mt-1">Create your first advert or adjust the filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
