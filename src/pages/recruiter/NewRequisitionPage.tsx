import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import {
  Position,
  AdvertType,
  RequisitionPriority,
  GRADE_LEVELS,
  GRADE_STEPS,
  PRIORITY_STYLES,
  getPositions,
  createRequisition,
} from '../../services/requisitionService';
import { BankQuestion, getQuestionBank } from '../../services/questionBankService';
import { STORAGE_ENABLED } from '../../lib/featureFlags';

interface NewRequisitionPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function NewRequisitionPage({ onBack, onSuccess }: NewRequisitionPageProps) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);

  const [positionId, setPositionId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [gradeStep, setGradeStep] = useState('');
  const [priority, setPriority] = useState<RequisitionPriority>('medium');
  const [vacancies, setVacancies] = useState(1);
  const [advertType, setAdvertType] = useState<AdvertType>('external');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    getPositions().then(setPositions).catch(() => {});
    getQuestionBank().then(setQuestionBank).catch(() => {});
  }, []);

  const selectedPosition = positions.find((p) => p.id === positionId);

  // Prefill from the position's Job Evaluation hint (e.g. "3b").
  useEffect(() => {
    const hint = selectedPosition?.gradeHint?.trim().toLowerCase() || '';
    if (/^[1-6][abc]$/.test(hint)) {
      setGradeLevel(hint[0]);
      setGradeStep(hint[1]);
    }
  }, [positionId]);

  const grade = gradeLevel && gradeStep ? `${gradeLevel}${gradeStep}` : '';
  const canSubmit = !!selectedPosition && !!grade && vacancies >= 1 && !submitting;

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
        priority,
        vacancies,
        advertType,
        questions: questionBank.filter((q) => selectedQuestionIds.includes(q.id)),
        notes: notes.trim() || undefined,
        jobDescriptionFile,
        createdBy: user,
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
          <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Requisition raised</h1>
          <p className="text-gray-600 mb-2">
            Reference <span className="font-mono font-bold">{referenceNumber}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            The recruiting team has been notified and will refine the requisition, then send it back for confirmation.
          </p>
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">New Job Requisition</h1>
        <p className="text-gray-500">
          Raise a requisition against a pre-loaded position. It goes to the recruiting team first,
          returns for hiring-manager confirmation, then admin approval before publishing.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Grade <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="">Level…</option>
                {GRADE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                value={gradeStep}
                onChange={(e) => setGradeStep(e.target.value)}
              >
                <option value="">Step…</option>
                {GRADE_STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Levels 1–6, steps a–c{grade ? ` — selected: ${grade}` : ''}. Required to proceed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequisitionPriority)}
            >
              {(Object.keys(PRIORITY_STYLES) as RequisitionPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>
              ))}
            </select>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold border ${PRIORITY_STYLES[priority].badge}`}>
              {PRIORITY_STYLES[priority].label} priority
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacancies</label>
            <input
              type="number"
              min={1}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
              value={vacancies}
              onChange={(e) => setVacancies(Math.max(1, Number(e.target.value)))}
            />
          </div>
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
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Screening Question Templates</label>
          <p className="text-xs text-gray-500 mb-2">
            Maintained by admins in the Pre-screening Builder. Selected questions travel with the requisition into the job advert.
          </p>
          {questionBank.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No question templates yet — an admin can add them in the Pre-screening Builder.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 max-h-44 overflow-y-auto space-y-1.5">
              {questionBank.map((q) => (
                <label key={q.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <span>
                    {q.text}
                    <span className="text-xs text-gray-400"> — {q.type}{q.score ? `, ${q.score} pts` : ''}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes for the recruiter</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none h-20 resize-none"
            placeholder="Context, must-haves, timeline…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description (optional)</label>
          {STORAGE_ENABLED ? (
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setJobDescriptionFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
              <FileText className="size-4 shrink-0" /> Attachments are unavailable until document storage is enabled.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting}>Cancel</Button>
        <Button
          className="bg-autumn-primary hover:bg-autumn-dark text-white px-8"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Raise Requisition'}
        </Button>
      </div>
    </div>
  );
}
