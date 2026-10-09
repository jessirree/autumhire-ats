import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Download, Archive, ArchiveRestore, X, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { SortableHeader } from '../../components/ats/SortableHeader';
import { sortRows, useTableSort, SortColumn } from '../../lib/tableSort';
import { computeMatch, MatchResult } from '../../lib/matching';
import { useAuth } from '../../context/AuthContext';
import {
  Application,
  ApplicationStatus,
  getAllApplications,
  getApplicationsForJob,
  bulkUpdateStatus,
  setApplicationsArchived,
} from '../../services/applicationService';
import { Job, getJobById } from '../../services/jobService';
import { CandidateProfile, getCandidateProfile } from '../../services/profileService';
import { downloadCsv } from '../../lib/exportCsv';
import { exportApplicationsXlsx } from '../../lib/exportApplicationsXlsx';
import { logAudit } from '../../services/auditService';
import { DownloadCvsButton } from '../../components/ats/DownloadCvsButton';

interface ApplicationsPageProps {
  /** `returnQuery` is this page's current query string, so "Back to Applications" can restore it. */
  onViewCandidate: (id: string, returnQuery: string) => void;
}

function exportToCSV(applications: Application[]) {
  const headers = ['Candidate', 'Email', 'Phone', 'Job', 'Department', 'Applied', 'Score', 'Status', 'Gender', 'Nationality', 'City', 'Source'];
  const rows = applications.map((a) => [
    a.candidateName, a.email, a.phone ?? '', a.jobTitle, a.department,
    a.appliedAt?.toDate ? a.appliedAt.toDate().toISOString().slice(0, 10) : '',
    a.prescreenScore, a.status, a.gender ?? '', a.nationality ?? '', a.city ?? '', a.source ?? '',
  ]);
  downloadCsv(`applications-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

const BULK_ACTIONS: { label: string; status: ApplicationStatus }[] = [
  { label: 'Move to Longlist', status: 'longlisted' },
  { label: 'Move to Shortlist', status: 'shortlisted' },
  { label: 'Move to Interview', status: 'interview' },
  { label: 'Reject Candidates', status: 'rejected' },
];

type SortKey = 'candidateName' | 'appliedAt' | 'prescreenScore' | 'status' | 'matchScore' | 'matchFlag';

export function ApplicationsPage({ onViewCandidate }: ApplicationsPageProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobFilterId = searchParams.get('job');
  // B: these four used to be component state and died the moment the user
  // opened a candidate. The job filter already lived in the URL (?job=) and
  // survived a reload — same pattern, same reason, applied to the rest so a
  // filtered view is a URL a recruiter can bookmark or send on, not just
  // something that happens to survive this one filter.
  const searchTerm = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const departmentFilter = searchParams.get('department') ?? '';
  const showArchived = searchParams.get('archived') === '1';
  const [filterJob, setFilterJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  // Candidate-matching spec §2.4: a row's match score/flag needs that
  // application's Job (requirements + linked questions) and the
  // candidate's current capability profile — neither is denormalized onto
  // Application, so both are fetched in load() below, deduped and in
  // parallel across however many jobs/candidates are in view.
  const [jobsById, setJobsById] = useState<Record<string, Job>>({});
  const [profilesByCandidateId, setProfilesByCandidateId] = useState<Record<string, CandidateProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('Bulk Actions');
  const [archiving, setArchiving] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const { sortKey, sortDir, toggleSort } = useTableSort<SortKey>('appliedAt', 'desc', ['candidateName']);

  const updateParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const setSearchTerm = (v: string) => updateParam('q', v || null);
  const setStatusFilter = (v: string) => updateParam('status', v || null);
  const setDepartmentFilter = (v: string) => updateParam('department', v || null);
  const setShowArchived = (v: boolean) => updateParam('archived', v ? '1' : null);

  const clearJobFilter = () => updateParam('job', null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      jobFilterId ? getApplicationsForJob(jobFilterId) : getAllApplications(showArchived),
      jobFilterId ? getJobById(jobFilterId) : Promise.resolve(null),
    ])
      .then(async ([apps, job]) => {
        const visibleApps = jobFilterId
          ? apps.filter((a) => (showArchived ? a.archived : !a.archived))
          : showArchived
            ? apps.filter((a) => a.archived)
            : apps;
        setApplications(visibleApps);
        setFilterJob(job);

        // Fetched together with the applications themselves, before
        // setLoading(false), so the table never renders with match cells
        // that pop in a moment later.
        const uniqueJobIds = [...new Set(visibleApps.map((a) => a.jobId))];
        const uniqueCandidateIds = [...new Set(visibleApps.map((a) => a.candidateId))];
        const [jobs, profiles] = await Promise.all([
          Promise.all(uniqueJobIds.map((id) => (job && id === job.id ? Promise.resolve(job) : getJobById(id)))),
          Promise.all(uniqueCandidateIds.map((id) => getCandidateProfile(id))),
        ]);
        setJobsById(
          Object.fromEntries(
            uniqueJobIds.map((id, i) => [id, jobs[i]] as const).filter((entry): entry is [string, Job] => !!entry[1])
          )
        );
        setProfilesByCandidateId(Object.fromEntries(uniqueCandidateIds.map((id, i) => [id, profiles[i]])));
      })
      .catch((err: any) => {
        console.error('Failed to load applications', err);
        setError(err?.message || 'Failed to load applications.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedApplications([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, jobFilterId]);

  // Drop selections when the visible set changes so a bulk action can never
  // act on rows the user can no longer see.
  useEffect(() => {
    setSelectedApplications([]);
  }, [searchTerm, statusFilter, departmentFilter]);

  const departments = Array.from(new Set(applications.map((a) => a.department).filter(Boolean)));

  // Computed once per render from already-loaded data (candidate-matching
  // spec §7: arithmetic over data the page already loads) — not stored
  // anywhere, see src/lib/matching.ts's own header comment for why.
  const matchByAppId = useMemo(() => {
    const map: Record<string, MatchResult> = {};
    for (const app of applications) {
      const job = jobsById[app.jobId];
      if (!job) continue;
      map[app.id] = computeMatch(
        {
          minYearsExperience: job.minYearsExperience,
          minEducation: job.minEducation,
          requiredSkillIds: job.requiredSkillIds,
          workAuthorizationRequired: job.workAuthorizationRequired,
        },
        profilesByCandidateId[app.candidateId] ?? {},
        job.questions ?? [],
        app.answers ?? []
      );
    }
    return map;
  }, [applications, jobsById, profilesByCandidateId]);

  const SORT_COLUMNS: Record<SortKey, SortColumn<Application>> = useMemo(
    () => ({
      candidateName: { getValue: (a) => a.candidateName, type: 'string' },
      appliedAt: { getValue: (a) => a.appliedAt?.toMillis?.() ?? null },
      prescreenScore: { getValue: (a) => a.prescreenScore },
      status: { getValue: (a) => a.status, type: 'string' },
      // Null (not assessed) sorts last in both directions — tableSort's
      // existing convention, not something added for this column.
      matchScore: { getValue: (a) => matchByAppId[a.id]?.score ?? undefined },
      // 1 = flagged, 0 = met, undefined (not required/not assessed) sorts
      // last — descending brings "everyone failing work authorisation" to
      // the top in one click (spec §3.5).
      matchFlag: { getValue: (a) => (matchByAppId[a.id]?.hardCriterion.status === 'unmet' ? 1 : matchByAppId[a.id]?.hardCriterion.status === 'met' ? 0 : undefined) },
    }),
    [matchByAppId]
  );

  const filteredApplications = sortRows(
    applications.filter((app) => {
      const matchesSearch =
        app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || app.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesDepartment = !departmentFilter || app.department === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    }),
    SORT_COLUMNS,
    sortKey,
    sortDir
  );

  const toggleSelection = (id: string) => {
    setSelectedApplications((prev) =>
      prev.includes(id) ? prev.filter((appId) => appId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredApplications.map((app) => app.id));
    }
  };

  const handleApplyBulkAction = async () => {
    if (bulkAction === 'Bulk Actions' || !user) return;
    const action = BULK_ACTIONS.find((a) => a.label === bulkAction);
    if (!action) return;
    const targets = applications.filter((a) => selectedApplications.includes(a.id));
    try {
      await bulkUpdateStatus(targets, action.status, user);
      setSelectedApplications([]);
      setBulkAction('Bulk Actions');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Bulk update failed.');
    }
  };

  const handleExportXlsx = async () => {
    if (!user || !filterJob) return;
    setExportingXlsx(true);
    try {
      await exportApplicationsXlsx(filterJob, applications);
      await logAudit(
        user,
        'update',
        'Job',
        filterJob.id,
        `Exported ${applications.length} application(s) to Excel for "${filterJob.title}"`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export to Excel.');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleArchiveSelected = async (archived: boolean) => {
    if (!user || selectedApplications.length === 0) return;
    setArchiving(true);
    try {
      await setApplicationsArchived(selectedApplications, archived, user);
      toast.success(
        `${selectedApplications.length} candidate file(s) ${archived ? 'archived' : 'restored to active'}.`
      );
      setSelectedApplications([]);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update archive status.');
    } finally {
      setArchiving(false);
    }
  };

  // Shared by both per-job exports below: Excel needs the job's own
  // screening questions for its column matrix, same as the CV zip needs a
  // single job's worth of files — neither makes sense across every job.
  const jobFilterDisabledReason = !jobFilterId
    ? 'Filter to a specific job first — downloading CVs across every job is not supported.'
    : !filterJob
      ? 'This job could not be found.'
      : undefined;
  const xlsxDisabledReason = !jobFilterId
    ? 'Filter to a specific job first — exporting to Excel across every job is not supported.'
    : !filterJob
      ? 'This job could not be found.'
      : undefined;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Applications</h1>
          <p className="text-gray-500">Manage and review all candidate applications across your jobs.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className={`gap-2 rounded-xl ${showArchived ? 'bg-orange-50 text-autumn-primary border-autumn-primary/40' : ''}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => exportToCSV(filteredApplications)}>
            <Download className="size-4" />
            Export to CSV
          </Button>
          <DownloadCvsButton
            className="rounded-xl"
            job={
              filterJob
                ? { id: filterJob.id, referenceNumber: filterJob.referenceNumber, title: filterJob.title }
                : { id: jobFilterId ?? '', referenceNumber: '', title: '' }
            }
            applications={applications}
            disabledReason={jobFilterDisabledReason}
          />
          <TooltipProvider delayDuration={200}>
            {xlsxDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button variant="outline" className="gap-2 rounded-xl" disabled>
                      <FileSpreadsheet className="size-4" />
                      Export to Excel
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{xlsxDisabledReason}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                disabled={exportingXlsx}
                onClick={handleExportXlsx}
              >
                {exportingXlsx ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                Export to Excel
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>

      {jobFilterId && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-5 py-3">
          <p className="text-sm text-blue-900">
            Filtered to{' '}
            <span className="font-semibold">
              {filterJob ? `${filterJob.title} (${filterJob.referenceNumber})` : 'a job that could not be found'}
            </span>
            .
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={clearJobFilter}>
            <X className="size-3.5" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
            >
              <option value="">All Stages</option>
              <option value="applied">Applied</option>
              <option value="longlisted">Longlisted</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="regretted">Regretted</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedApplications.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-orange-50/50 border-b border-orange-100">
            <span className="text-sm font-semibold text-autumn-charcoal">
              {selectedApplications.length} candidate{selectedApplications.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3 ml-auto">
              {!showArchived && (
                <>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-orange-200 rounded-lg bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-autumn-primary/20"
                  >
                    <option value="Bulk Actions">Bulk Actions</option>
                    {BULK_ACTIONS.map((a) => (
                      <option key={a.label} value={a.label}>{a.label}</option>
                    ))}
                  </select>
                  <Button
                    onClick={handleApplyBulkAction}
                    size="sm"
                    className="bg-autumn-primary hover:bg-autumn-dark text-white rounded-lg h-9"
                  >
                    Apply Action
                  </Button>
                </>
              )}
              <Button
                onClick={() => handleArchiveSelected(!showArchived)}
                size="sm"
                variant="outline"
                disabled={archiving}
                className="rounded-lg h-9 gap-2 border-gray-300"
              >
                {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {showArchived ? 'Unarchive' : 'Archive'}
              </Button>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-gray-300 text-autumn-primary focus:ring-autumn-primary"
                  />
                </th>
                <SortableHeader label="Candidate" sortKey="candidateName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Job Context
                </th>
                <SortableHeader label="Applied" sortKey="appliedAt" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Screening Score" sortKey="prescreenScore" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Match Score" sortKey="matchScore" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Work Auth" sortKey="matchFlag" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Stage" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedApplications.includes(app.id)}
                      onChange={() => toggleSelection(app.id)}
                      className="size-4 rounded border-gray-300 text-autumn-primary focus:ring-autumn-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-gradient-to-br from-orange-100 to-amber-100 text-autumn-charcoal rounded-full flex items-center justify-center font-bold shadow-sm">
                        {app.candidateName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{app.candidateName}</span>
                        <span className="text-xs text-gray-500">{app.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{app.jobTitle}</span>
                      <span className="text-xs text-gray-500">{app.department}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {app.appliedAt?.toDate
                      ? app.appliedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold text-gray-700 w-8">{app.prescreenScore}</span>
                       <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${app.prescreenScore > 80 ? 'bg-green-500' : app.prescreenScore > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(app.prescreenScore, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {matchByAppId[app.id]?.score == null ? (
                      <span className="text-xs text-gray-400 italic">Not assessed</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700 w-8">{matchByAppId[app.id]!.score}</span>
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${matchByAppId[app.id]!.score! > 80 ? 'bg-green-500' : matchByAppId[app.id]!.score! > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(matchByAppId[app.id]!.score!, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {matchByAppId[app.id]?.hardCriterion.status === 'unmet' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="size-3" /> Flagged
                      </span>
                    ) : matchByAppId[app.id]?.hardCriterion.status === 'met' ? (
                      <span className="text-xs text-green-600">OK</span>
                    ) : matchByAppId[app.id]?.hardCriterion.status === 'not-assessed' ? (
                      <span className="text-xs text-gray-400 italic">Not assessed</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCandidate(app.id, searchParams.toString())}
                        className="h-8 border-gray-200 hover:bg-gray-50 hover:text-autumn-primary"
                      >
                        View
                      </Button>
                      {app.cvUrl && (
                        <a
                          href={app.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={`${app.candidateName.replace(/\s+/g, '_')}-${app.jobId}-CV`}
                          className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-autumn-primary transition-colors"
                          title="Download CV"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">Loading applications…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-red-600 font-medium mb-3">{error}</p>
                    <Button variant="outline" size="sm" onClick={load}>Retry</Button>
                  </td>
                </tr>
              )}
              {!loading && !error && filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="size-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="size-6 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">No applications found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-sm font-medium text-gray-500">
            Showing <span className="text-gray-900">{filteredApplications.length}</span> of <span className="text-gray-900">{applications.length}</span> applications
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg h-8">Previous</Button>
            <Button variant="outline" size="sm" className="rounded-lg h-8">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

