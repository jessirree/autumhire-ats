import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { Search, Filter, Plus, FileText, History, Loader2, X } from 'lucide-react';
import { Requisition, Approval, getRequisitions, getRequisitionApprovals } from '../../services/requisitionService';

interface JobRequisitionsPageProps {
  onCreateRequisition: () => void;
}

export function JobRequisitionsPage({ onCreateRequisition }: JobRequisitionsPageProps) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [historyFor, setHistoryFor] = useState<Requisition | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setRequisitions(await getRequisitions());
      } catch (e: any) {
        setError('Failed to load requisitions: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRequisitions = requisitions.filter((req) => {
    const matchesSearch =
      req.positionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConvertToAdvert = (id: string, title: string) => {
    alert(`Converted Requisition ${id} (${title}) to a Draft Job Advert.`);
  };

  const handleViewApprovalHistory = async (requisition: Requisition) => {
    setHistoryFor(requisition);
    setHistoryLoading(true);
    try {
      setApprovals(await getRequisitionApprovals(requisition.id));
    } catch (e: any) {
      setError('Failed to load approval history: ' + e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (value: any) => (value?.toDate ? value.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Job Requisitions</h1>
          <p className="text-gray-500">Manage and track the status of all hiring requests.</p>
        </div>
        <Button
          onClick={onCreateRequisition}
          className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl"
        >
          <Plus className="size-4" />
          New Requisition
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requisitions..."
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
              <option value="pending-approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requisition Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department & Vacancies</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="size-8 animate-spin text-gray-300 mx-auto" /></td></tr>
              ) : filteredRequisitions.map((req) => (
                <tr key={req.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{req.positionTitle}{req.grade ? ` • Grade ${req.grade}` : ''}</span>
                      <span className="text-xs text-gray-500 font-mono">{req.referenceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{req.department}</span>
                      <span className="text-xs text-gray-500">{req.vacancies} vacanc{req.vacancies === 1 ? 'y' : 'ies'} · {req.advertType === 'internal' ? 'Internal' : 'External'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={req.status === 'pending-approval' ? `Pending (L${req.currentLevel}/${req.totalLevels})` : req.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {req.status === 'approved' && (
                        <Button
                          size="sm"
                          className="bg-autumn-primary hover:bg-autumn-dark text-white h-8 text-xs rounded-lg"
                          onClick={() => handleConvertToAdvert(req.id, req.positionTitle)}
                        >
                          Convert to Job Advert
                        </Button>
                      )}
                      {req.jobDescriptionUrl && (
                        <a
                          href={req.jobDescriptionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-autumn-primary transition-colors p-1.5 rounded-lg hover:bg-orange-50"
                          title="View Job Description"
                        >
                          <FileText className="size-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleViewApprovalHistory(req)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                        title="View Approval History"
                      >
                        <History className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredRequisitions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No requisitions found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Approval History</h3>
                <p className="text-xs text-gray-500 font-mono">{historyFor.referenceNumber}</p>
              </div>
              <button onClick={() => setHistoryFor(null)} className="text-gray-400 hover:text-gray-600">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="size-6 animate-spin text-gray-300" /></div>
              ) : approvals.length === 0 ? (
                <p className="text-sm text-gray-500">No approval steps recorded.</p>
              ) : (
                approvals.map((a) => (
                  <div key={a.id} className="flex items-start justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Level {a.level}: {a.approverName}</p>
                      {a.comment && <p className="text-xs text-gray-500 mt-0.5">"{a.comment}"</p>}
                      {a.decidedAt?.toDate && (
                        <p className="text-xs text-gray-400 mt-0.5">{a.decidedAt.toDate().toLocaleDateString()}</p>
                      )}
                    </div>
                    <StatusBadge status={a.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
