import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Send, Rocket, Pencil, X, History } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import {
  Requisition,
  RequisitionPriority,
  AdvertType,
  GRADE_LEVELS,
  GRADE_STEPS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  getRequisitions,
  updateRequisitionDetails,
  sendForConfirmation,
} from '../../services/requisitionService';
import { BankQuestion, getQuestionBank } from '../../services/questionBankService';

interface JobRequisitionsPageProps {
  onCreateRequisition: () => void;
  onPublish: (requisitionId: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  'with-recruiter': 'bg-blue-100 text-blue-800 border-blue-200',
  'pending-confirmation': 'bg-purple-100 text-purple-800 border-purple-200',
  'pending-admin': 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  published: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function JobRequisitionsPage({ onCreateRequisition, onPublish }: JobRequisitionsPageProps) {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [historyFor, setHistoryFor] = useState<Requisition | null>(null);
  const [form, setForm] = useState({
    gradeLevel: '', gradeStep: '', priority: 'medium' as RequisitionPriority,
    vacancies: 1, advertType: 'external' as AdvertType, notes: '', questionIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getRequisitions()
      .then(setRequisitions)
      .catch((err) => console.error('Failed to load requisitions', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getQuestionBank().then(setQuestionBank).catch(() => {});
  }, []);

  const openEdit = (req: Requisition) => {
    setEditing(req);
    setForm({
      gradeLevel: req.grade?.[0] ?? '',
      gradeStep: req.grade?.[1] ?? '',
      priority: req.priority,
      vacancies: req.vacancies,
      advertType: req.advertType,
      notes: req.notes ?? '',
      questionIds: (req.questions ?? []).map((q) => q.id),
    });
  };

  const handleSave = async (sendOn: boolean) => {
    if (!editing || !user) return;
    const grade = `${form.gradeLevel}${form.gradeStep}`;
    setSaving(true);
    try {
      await updateRequisitionDetails(editing, {
        grade,
        priority: form.priority,
        vacancies: form.vacancies,
        advertType: form.advertType,
        notes: form.notes,
        questions: questionBank.filter((q) => form.questionIds.includes(q.id)),
      }, user);
      if (sendOn) {
        const fresh = { ...editing, history: [...editing.history, { action: 'Edited by recruiter', byId: user.id, byName: user.name, at: new Date() }] };
        await sendForConfirmation(fresh as Requisition, user);
      }
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save requisition.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Job Requisitions</h1>
          <p className="text-gray-500">
            Refine incoming requisitions, send them for confirmation, and publish approved ones.
            Rows are colour-coded by priority.
          </p>
        </div>
        <Button onClick={onCreateRequisition} className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl">
          <Plus className="size-4" />
          New Requisition
        </Button>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-gray-500 text-center py-8">Loading requisitions…</p>}
        {!loading && requisitions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            No requisitions yet.
          </div>
        )}
        {requisitions.map((req) => {
          const pr = PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.medium;
          return (
            <div key={req.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${pr.row}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-gray-900">{req.positionTitle}</span>
                    <span className="text-xs text-gray-400 font-mono">{req.referenceNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pr.badge}`}>{pr.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_BADGE[req.status] ?? ''}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                    {req.skippedApproval && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" title={`Reason: ${req.skipReason}`}>
                        Admin approval skipped
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {req.department} • Grade {req.grade} • {req.vacancies} vacanc{req.vacancies === 1 ? 'y' : 'ies'} • {req.advertType} advert
                    • Raised by {req.createdByName}
                    {(req.questions ?? []).length > 0 && <> • {req.questions.length} screening question{req.questions.length > 1 ? 's' : ''}</>}
                  </p>
                  {req.notes && <p className="text-xs text-gray-400 italic mt-1">“{req.notes}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryFor(req)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                    title="History"
                  >
                    <History className="size-4" />
                  </button>
                  {req.status === 'with-recruiter' && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(req)}>
                      <Pencil className="size-3.5" /> Review & Edit
                    </Button>
                  )}
                  {req.status === 'approved' && (
                    <Button size="sm" className="bg-autumn-primary hover:bg-autumn-dark text-white gap-1.5" onClick={() => onPublish(req.id)}>
                      <Rocket className="size-3.5" /> Publish Job
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editing.positionTitle}</h2>
                <p className="text-xs text-gray-500">{editing.referenceNumber} — raised by {editing.createdByName}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grade level</label>
                  <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="w-full p-2 border border-gray-200 rounded-lg text-sm">
                    {GRADE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Step</label>
                  <select value={form.gradeStep} onChange={(e) => setForm({ ...form, gradeStep: e.target.value })} className="w-full p-2 border border-gray-200 rounded-lg text-sm">
                    {GRADE_STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as RequisitionPriority })} className="w-full p-2 border border-gray-200 rounded-lg text-sm">
                    {(Object.keys(PRIORITY_STYLES) as RequisitionPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vacancies</label>
                  <input type="number" min={1} value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: Math.max(1, Number(e.target.value)) })} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Advert type</label>
                  <select value={form.advertType} onChange={(e) => setForm({ ...form, advertType: e.target.value as AdvertType })} className="w-full p-2 border border-gray-200 rounded-lg text-sm">
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Screening question templates</label>
                <div className="border border-gray-200 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1">
                  {questionBank.length === 0 && <p className="text-xs text-gray-400">No templates in the question bank.</p>}
                  {questionBank.map((q) => (
                    <label key={q.id} className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.questionIds.includes(q.id)}
                        onChange={() => setForm({
                          ...form,
                          questionIds: form.questionIds.includes(q.id)
                            ? form.questionIds.filter((x) => x !== q.id)
                            : [...form.questionIds, q.id],
                        })}
                      />
                      <span>{q.text}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full p-2 border border-gray-200 rounded-lg text-sm h-16 resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>Save Only</Button>
              <Button className="bg-autumn-primary hover:bg-autumn-dark text-white gap-1.5" disabled={saving} onClick={() => handleSave(true)}>
                <Send className="size-3.5" /> {saving ? 'Saving…' : 'Save & Send for Confirmation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">{historyFor.referenceNumber} — history</h2>
              <button onClick={() => setHistoryFor(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(historyFor.history ?? []).map((h, i) => (
                <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                  <p className="font-medium text-gray-900">{h.action}</p>
                  <p className="text-xs text-gray-500">by {h.byName}{h.comment ? ` — “${h.comment}”` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
