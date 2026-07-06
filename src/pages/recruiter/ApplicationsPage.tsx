import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Filter, Download, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  Application,
  ApplicationStatus,
  getAllApplications,
  bulkUpdateStatus,
  setApplicationsArchived,
} from '../../services/applicationService';

interface ApplicationsPageProps {
  onViewCandidate: (id: string) => void;
}

function exportToCSV(applications: Application[]) {
  const headers = ['Candidate', 'Email', 'Phone', 'Job', 'Department', 'Applied', 'Score', 'Status', 'Gender', 'Nationality', 'City', 'Source'];
  const rows = applications.map((a) => [
    a.candidateName, a.email, a.phone ?? '', a.jobTitle, a.department,
    a.appliedAt?.toDate ? a.appliedAt.toDate().toISOString().slice(0, 10) : '',
    String(a.prescreenScore), a.status, a.gender ?? '', a.nationality ?? '', a.city ?? '', a.source ?? '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const BULK_ACTIONS: { label: string; status: ApplicationStatus }[] = [
  { label: 'Move to Longlist', status: 'longlisted' },
  { label: 'Move to Shortlist', status: 'shortlisted' },
  { label: 'Move to Interview', status: 'interview' },
  { label: 'Reject Candidates', status: 'rejected' },
];

export function ApplicationsPage({ onViewCandidate }: ApplicationsPageProps) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('Bulk Actions');
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllApplications(showArchived)
      .then((apps) => setApplications(showArchived ? apps.filter((a) => a.archived) : apps))
      .catch((err) => console.error('Failed to load applications', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedApplications([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // Drop selections when the visible set changes so a bulk action can never
  // act on rows the user can no longer see.
  useEffect(() => {
    setSelectedApplications([]);
  }, [searchTerm, statusFilter, departmentFilter]);

  const departments = Array.from(new Set(applications.map((a) => a.department).filter(Boolean)));

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || app.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesDepartment = !departmentFilter || app.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

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
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => exportToCSV(filteredApplications)}>
            <Download className="size-4" />
            Export to CSV
          </Button>
        </div>
      </div>

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

            <Button variant="outline" className="rounded-xl">
              <Filter className="size-4 mr-2" />
              More Filters
            </Button>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Job Context
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Screening Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
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
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCandidate(app.id)}
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading applications…</td>
                </tr>
              )}
              {!loading && filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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

