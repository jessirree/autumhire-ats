import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckSquare, ThumbsUp, ThumbsDown, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Requisition, Approval, getPendingApprovalsForUser, decideApproval } from '../../services/requisitionService';

export function RequisitionApprovals() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ requisition: Requisition; approval: Approval }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await getPendingApprovalsForUser(user.id));
    } catch (e: any) {
      setError('Failed to load pending approvals: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleDecision = async (requisitionId: string, level: number, decision: 'approved' | 'rejected') => {
    if (!user) return;
    setActingOn(requisitionId);
    setError('');
    try {
      await decideApproval(requisitionId, level, decision, comments[requisitionId], { id: user.id, name: user.name });
      await load();
    } catch (e: any) {
      setError('Failed to record decision: ' + e.message);
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Requisition Approvals</h1>
        <p className="text-gray-500">Requisitions awaiting your decision, in approval order.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-gray-300" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          <CheckSquare className="size-12 mx-auto text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-900">Nothing pending</p>
          <p className="text-sm">You have no requisitions waiting on your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(({ requisition, approval }) => (
            <div key={requisition.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{requisition.positionTitle}</h3>
                    <span className="text-xs text-gray-500 font-mono">{requisition.referenceNumber}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {requisition.department} · {requisition.vacancies} vacanc{requisition.vacancies === 1 ? 'y' : 'ies'} · {requisition.advertType === 'internal' ? 'Internal' : 'External'} advert
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Requested by {requisition.requestedByName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={`Level ${approval.level} of ${requisition.totalLevels}`} size="sm" />
                  {requisition.jobDescriptionUrl && (
                    <a
                      href={requisition.jobDescriptionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs flex items-center gap-1 text-autumn-primary hover:underline"
                    >
                      <FileText className="size-3.5" /> View JD
                    </a>
                  )}
                </div>
              </div>

              <textarea
                placeholder="Optional comment for your decision…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary mb-3"
                rows={2}
                value={comments[requisition.id] || ''}
                onChange={(e) => setComments({ ...comments, [requisition.id]: e.target.value })}
              />

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDecision(requisition.id, approval.level, 'rejected')}
                  disabled={actingOn === requisition.id}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="size-4 mr-2" /> Reject
                </Button>
                <Button
                  onClick={() => handleDecision(requisition.id, approval.level, 'approved')}
                  disabled={actingOn === requisition.id}
                  className="bg-autumn-primary hover:bg-autumn-dark text-white"
                >
                  {actingOn === requisition.id ? <Loader2 className="size-4 animate-spin mr-2" /> : <ThumbsUp className="size-4 mr-2" />}
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
