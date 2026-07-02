import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Loader2, AlertCircle, CheckCircle2, Upload, X, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Position, AdvertType, ApproverInput, getPositions, createRequisition } from '../../services/requisitionService';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface NewRequisitionPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function NewRequisitionPage({ onBack, onSuccess }: NewRequisitionPageProps) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const [positionId, setPositionId] = useState('');
  const [grade, setGrade] = useState('');
  const [vacancies, setVacancies] = useState(1);
  const [advertType, setAdvertType] = useState<AdvertType>('external');
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [approverToAdd, setApproverToAdd] = useState('');
  const [approvers, setApprovers] = useState<ApproverInput[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [positionList, staffSnap] = await Promise.all([
          getPositions(true),
          getDocs(query(collection(db, 'Users'), orderBy('createdAt', 'desc'))),
        ]);
        setPositions(positionList);
        setStaff(
          staffSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter((u) => u.role === 'hiring-manager' || u.role === 'admin')
            .map((u) => ({ id: u.id, name: u.name, role: u.role }))
        );
      } catch (e: any) {
        setError('Failed to load form data: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedPosition = positions.find((p) => p.id === positionId);

  // Prefill the grade from the position's Job Evaluation hint when it changes.
  useEffect(() => {
    if (selectedPosition?.gradeHint) setGrade(selectedPosition.gradeHint);
  }, [positionId]);

  const addApprover = () => {
    if (!approverToAdd) return;
    const candidate = staff.find((s) => s.id === approverToAdd);
    if (!candidate || approvers.some((a) => a.id === candidate.id)) return;
    setApprovers([...approvers, { id: candidate.id, name: candidate.name }]);
    setApproverToAdd('');
  };

  const removeApprover = (id: string) => setApprovers(approvers.filter((a) => a.id !== id));

  const moveApprover = (index: number, direction: -1 | 1) => {
    const next = [...approvers];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setApprovers(next);
  };

  const canSubmit = !!selectedPosition && !!grade.trim() && vacancies >= 1 && approvers.length >= 1 && !submitting;

  const handleSubmit = async () => {
    if (!selectedPosition || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const requisition = await createRequisition({
        positionId: selectedPosition.id,
        positionTitle: selectedPosition.title,
        department: selectedPosition.department,
        grade,
        vacancies,
        advertType,
        jobDescriptionFile,
        approvers,
        requestedById: user.id,
        requestedByName: user.name,
      });
      setReferenceNumber(requisition.referenceNumber);
    } catch (e: any) {
      setError('Failed to submit requisition: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (referenceNumber) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <CheckCircle2 className="size-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Requisition Submitted</h2>
          <p className="text-gray-500 mb-4">
            Reference number <span className="font-mono font-semibold text-gray-900">{referenceNumber}</span> has been sent for approval.
          </p>
          <Button onClick={onSuccess} className="bg-autumn-primary hover:bg-autumn-dark text-white rounded-xl">
            Back to Requisitions
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">New Requisition</h1>
        <p className="text-gray-500">Raise a requisition to fill vacancies against a pre-loaded position.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          {positions.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No positions have been pre-loaded yet. Ask an admin to create one under Job Positions first.
            </p>
          ) : (
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            >
              <option value="">Select a position…</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title} — {p.department}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Grade <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-48 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
            placeholder="e.g. G7"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            From the Job Evaluation. The requisition cannot proceed without a grade
            {selectedPosition?.gradeHint ? ` (suggested for this position: ${selectedPosition.gradeHint})` : ''}.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vacancies</label>
          <input
            type="number"
            min={1}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
            value={vacancies}
            onChange={(e) => setVacancies(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Advert Type</label>
          <div className="flex gap-4">
            {(['external', 'internal'] as AdvertType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="advertType"
                  checked={advertType === type}
                  onChange={() => setAdvertType(type)}
                />
                {type === 'external' ? 'External' : 'Internal'}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description (optional)</label>
          {jobDescriptionFile ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-fit">
              <FileText className="size-4 text-autumn-primary" />
              {jobDescriptionFile.name}
              <button onClick={() => setJobDescriptionFile(null)} className="text-gray-400 hover:text-red-600">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-4 py-3 w-fit cursor-pointer hover:border-autumn-primary hover:text-autumn-primary">
              <Upload className="size-4" />
              Attach job description
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setJobDescriptionFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Approval Chain</label>
          {staff.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No hiring managers or admins exist yet to approve this requisition.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <select
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  value={approverToAdd}
                  onChange={(e) => setApproverToAdd(e.target.value)}
                >
                  <option value="">Select an approver to add…</option>
                  {staff.filter((s) => !approvers.some((a) => a.id === s.id)).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role === 'admin' ? 'Admin' : 'Hiring Manager'})</option>
                  ))}
                </select>
                <Button variant="outline" onClick={addApprover} disabled={!approverToAdd}>Add</Button>
              </div>
              {approvers.length > 0 && (
                <ol className="space-y-2">
                  {approvers.map((a, index) => (
                    <li key={a.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="size-6 rounded-full bg-autumn-primary/10 text-autumn-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-800 flex-1">{a.name}</span>
                      <button onClick={() => moveApprover(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                        <ArrowUp className="size-4" />
                      </button>
                      <button onClick={() => moveApprover(index, 1)} disabled={index === approvers.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                        <ArrowDown className="size-4" />
                      </button>
                      <button onClick={() => removeApprover(a.id)} className="text-gray-400 hover:text-red-600">
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-autumn-primary hover:bg-autumn-dark text-white rounded-xl"
        >
          {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Submit Requisition
        </Button>
      </div>
    </div>
  );
}
