import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Plus, FastForward, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { promptText } from '../../components/ui/confirm-dialog';
import { useAuth } from '../../context/AuthContext';
import {
  Requisition,
  PRIORITY_STYLES,
  STATUS_LABELS,
  getRequisitions,
  confirmRequisition,
  adminDecideRequisition,
  returnToRecruiter,
} from '../../services/requisitionService';

/**
 * Role-aware approvals page:
 *  - hiring managers confirm requisitions the recruiter sent back (with the
 *    documented option to skip admin approval)
 *  - admins approve/reject confirmed requisitions
 */
export function RequisitionApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const load = () => {
    setLoading(true);
    getRequisitions()
      .then(setRequisitions)
      .catch((err) => console.error('Failed to load requisitions', err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const pending = requisitions.filter((r) =>
    isAdmin
      ? r.status === 'pending-admin'
      : r.status === 'pending-confirmation' && r.createdById === user?.id
  );

  const handleConfirm = async (req: Requisition, skip: boolean) => {
    if (!user) return;
    let reason: string | undefined;
    if (skip) {
      reason = await promptText({
        title: 'You are skipping admin approval — this will be documented on the requisition and in the audit trail.',
        description: 'Reason for skipping:',
      }) || undefined;
      if (reason === undefined) return; // cancelled
    }
    try {
      await confirmRequisition(req, user, skip, reason);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm.');
    }
  };

  const handleReturn = async (req: Requisition) => {
    if (!user) return;
    const comment = await promptText({ title: 'What should the recruiter change?' });
    if (!comment?.trim()) return;
    try {
      await returnToRecruiter(req, user, comment.trim());
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to return.');
    }
  };

  const handleAdminDecision = async (req: Requisition, decision: 'approved' | 'rejected') => {
    if (!user) return;
    const comment = await promptText({ title: `Comment for the ${decision === 'approved' ? 'approval' : 'rejection'} (optional):` }) || undefined;
    try {
      await adminDecideRequisition(req, decision, comment, user);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record decision.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">
            {isAdmin ? 'Requisition Approvals' : 'Requisition Confirmations'}
          </h1>
          <p className="text-gray-500">
            {isAdmin
              ? 'Requisitions confirmed by the hiring manager, awaiting your approval.'
              : 'Requisitions the recruiting team refined and sent back for your confirmation.'}
          </p>
        </div>
        {!isAdmin && (
          <Button
            onClick={() => navigate('/hiring/requisitions/new')}
            className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl"
          >
            <Plus className="size-4" />
            New Requisition
          </Button>
        )}
      </div>

      {loading && <p className="text-gray-500 text-center py-8">Loading…</p>}
      {!loading && pending.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          <CheckCircle className="size-12 mx-auto text-green-300 mb-3" />
          <p className="text-lg font-medium text-gray-900">All caught up</p>
          <p className="text-sm mt-1">Nothing is waiting for you here.</p>
        </div>
      )}

      {pending.map((req) => {
        const pr = PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.medium;
        return (
          <div key={req.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${pr.row}`}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-bold text-lg text-gray-900">{req.positionTitle}</h3>
              <span className="text-xs text-gray-400 font-mono">{req.referenceNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pr.badge}`}>{pr.label}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {STATUS_LABELS[req.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              {req.department} • Grade <span className="font-bold">{req.grade}</span> • {req.vacancies} vacanc{req.vacancies === 1 ? 'y' : 'ies'} • {req.advertType} advert
              {(req.questions ?? []).length > 0 && <> • {req.questions.length} screening question{req.questions.length > 1 ? 's' : ''}</>}
            </p>
            <p className="text-xs text-gray-400 mb-4">Raised by {req.createdByName}{req.notes ? ` — “${req.notes}”` : ''}</p>

            {(req.questions ?? []).length > 0 && (
              <div className="mb-4 space-y-1.5">
                {req.questions.map((q) => (
                  <div key={q.id} className="text-xs p-2 bg-gray-50 border border-gray-200 rounded text-gray-600">
                    <div className="font-medium text-gray-700">{q.text}</div>
                    <div className="text-gray-500 mt-0.5">
                      <span className="inline-block mr-2">{q.type}</span>
                      {q.choices?.length ? (
                        <span className="inline-block">{q.choices.map((c) => `${c.label} = ${c.points} pts`).join(' · ')}</span>
                      ) : q.score ? (
                        <span className="inline-block">{q.score} pts</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {isAdmin ? (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={() => handleAdminDecision(req, 'approved')}>
                    <CheckCircle className="size-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={() => handleAdminDecision(req, 'rejected')}>
                    <XCircle className="size-4" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleReturn(req)}>
                    <Undo2 className="size-4" /> Return to Recruiter
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={() => handleConfirm(req, false)}>
                    <CheckCircle className="size-4" /> Confirm — send to Admin
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50 gap-1.5"
                    title="Fast-track: the skip is documented on the requisition and audit trail"
                    onClick={() => handleConfirm(req, true)}
                  >
                    <FastForward className="size-4" /> Confirm & Skip Admin Approval
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleReturn(req)}>
                    <Undo2 className="size-4" /> Return to Recruiter
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
