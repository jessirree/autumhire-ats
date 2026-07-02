import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, FileText, Download, Star, Save, UserCheck, Calendar, CheckCircle2, XCircle, MessageSquare, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  Application,
  ApplicationStatus,
  PanelComment,
  getApplicationById,
  updateApplicationStatus,
  setPrescreenScore,
  addPanelComment,
  getPanelComments,
} from '../../services/applicationService';
import { Interview, getInterviewsForCandidate } from '../../services/interviewService';
import {
  ReferenceCheck,
  createReferenceCheck,
  getReferenceChecks,
  recordReferenceResponse,
} from '../../services/offerService';

interface CandidateDetailProps {
  candidateId: string; // application document id
  onBack: () => void;
}

export function CandidateDetail({ candidateId, onBack }: CandidateDetailProps) {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [comments, setComments] = useState<PanelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScore, setNewScore] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [referenceChecks, setReferenceChecks] = useState<ReferenceCheck[]>([]);
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ name: '', email: '', organization: '', relationship: '' });

  useEffect(() => {
    (async () => {
      try {
        const app = await getApplicationById(candidateId);
        setApplication(app);
        if (app) {
          setNewScore(app.prescreenScore);
          const [ivs, cms, refs] = await Promise.all([
            getInterviewsForCandidate(app.candidateId),
            getPanelComments(app.id),
            getReferenceChecks(app.id),
          ]);
          setInterviews(ivs.filter((iv) => iv.applicationId === app.id));
          setComments(cms);
          setReferenceChecks(refs);
        }
      } catch (err) {
        console.error('Failed to load candidate', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [candidateId]);

  const handleUpdateScore = async () => {
    if (!application || !user) return;
    await setPrescreenScore(application.id, newScore, user);
    setApplication({ ...application, prescreenScore: newScore });
  };

  const handleUpdateStatus = async (status: ApplicationStatus) => {
    if (!application || !user) return;
    try {
      await updateApplicationStatus(application, status, user, undefined, status === 'rejected');
      setApplication({ ...application, status });
    } catch (err: any) {
      alert(err?.message || 'Failed to update status.');
    }
  };

  const handleSaveNote = async () => {
    if (!application || !user || !notes.trim()) return;
    await addPanelComment(application.id, user, notes.trim(), 'screening');
    setComments(await getPanelComments(application.id));
    setNotes('');
  };

  const handleCreateReferenceCheck = async () => {
    if (!application || !user) return;
    if (!refForm.name.trim() || !refForm.email.trim()) {
      alert('Referee name and email are required.');
      return;
    }
    await createReferenceCheck(application, { ...refForm }, user);
    setReferenceChecks(await getReferenceChecks(application.id));
    setRefForm({ name: '', email: '', organization: '', relationship: '' });
    setShowRefForm(false);
  };

  const handleRecordResponse = async (check: ReferenceCheck) => {
    const response = prompt(`Record the response from ${check.referee.name}:`, check.response || '');
    if (response?.trim() && application) {
      await recordReferenceResponse(check.id, response.trim());
      setReferenceChecks(await getReferenceChecks(application.id));
    }
  };

  if (loading) return <div className="p-8">Loading candidate details...</div>;
  if (!application) {
    return (
      <div className="p-8">
        Candidate not found. <button onClick={onBack} className="text-blue-600 underline">Back</button>
      </div>
    );
  }

  const documents: { name: string; type: string; url: string }[] = [];
  if (application.cvUrl) documents.push({ name: application.cvFileName || 'CV', type: 'Resume', url: application.cvUrl });
  if (application.coverLetterUrl) documents.push({ name: application.coverLetterFileName || 'Cover letter', type: 'Cover Letter', url: application.coverLetterUrl });
  for (const d of application.otherDocsUrls ?? []) documents.push({ name: d.name, type: 'Other', url: d.url });

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="size-4" />
        Back to Applications
      </button>

      {/* Candidate Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="size-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-medium">
              {application.candidateName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold mb-2">{application.candidateName}</h1>
              <p className="text-gray-600 mb-3">
                Applied for <span className="font-medium">{application.jobTitle}</span> • {application.department}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" />
                  {application.email}
                </span>
                {application.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-4" />
                    {application.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {[application.city, application.country].filter(Boolean).join(', ') || '—'}
                </span>
                {application.isInternal && <StatusBadge status="Internal" size="sm" />}
                {application.workedHereBefore && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Ex-employee</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-sm text-gray-600 mb-1">Screening Score</p>
              <div className="flex items-center gap-2">
                <Star className="size-5 text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-semibold">{application.prescreenScore}</span>
              </div>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </div>

        {/* Pipeline Actions */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
          <Button className="bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-none border-0" onClick={() => handleUpdateStatus('longlisted')}>
            <UserCheck className="size-4 mr-2" /> Move to Longlist
          </Button>
          <Button className="bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-none border-0" onClick={() => handleUpdateStatus('shortlisted')}>
            <Star className="size-4 mr-2" /> Shortlist
          </Button>
          <Button className="bg-purple-50 text-purple-700 hover:bg-purple-100 shadow-none border-0" onClick={() => handleUpdateStatus('interview')}>
            <Calendar className="size-4 mr-2" /> Move to Interview
          </Button>
          <Button className="bg-green-50 text-green-700 hover:bg-green-100 shadow-none border-0" onClick={() => handleUpdateStatus('offer')}>
            <CheckCircle2 className="size-4 mr-2" /> Make Offer
          </Button>
          <div className="flex-1"></div>
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => handleUpdateStatus('rejected')}>
            <XCircle className="size-4 mr-2" /> Reject
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview & Documents */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Candidate Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Gender</h3>
                <p className="font-medium text-gray-900 capitalize">{application.gender || '—'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Nationality</h3>
                <p className="font-medium text-gray-900">{application.nationality || '—'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Date of Birth</h3>
                <p className="font-medium text-gray-900">{application.dateOfBirth || '—'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Source</h3>
                <p className="font-medium text-gray-900 capitalize">{application.source || '—'}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="size-5 text-gray-400" />
              Documents
            </h2>
            {documents.length === 0 && <p className="text-sm text-gray-500">No documents uploaded.</p>}
            <div className="space-y-3">
              {documents.map((docItem, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{docItem.name}</p>
                    <p className="text-xs text-gray-500">{docItem.type}</p>
                  </div>
                  <a
                    href={docItem.url}
                    target="_blank"
                    rel="noreferrer"
                    download={`${application.candidateName.replace(/\s+/g, '_')}-${application.jobId}-${docItem.type.replace(/\s+/g, '_')}`}
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="size-4" /> Download
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Status history */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Status History</h2>
            <div className="space-y-3">
              {(application.statusHistory ?? []).map((entry, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={entry.status} size="sm" />
                  <span className="text-gray-600">by {entry.byName}</span>
                  {entry.comment && <span className="text-gray-400 italic">“{entry.comment}”</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Screening & Notes & Interviews */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Screening Results</h2>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none font-bold text-center"
                  min="0"
                />
                <Button onClick={handleUpdateScore} size="sm" variant="outline" className="h-8 px-2" title="Save score">
                  <Save className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {(application.answers ?? []).length === 0 && (
                <p className="text-sm text-gray-500">No pre-screening questions for this job.</p>
              )}
              {(application.answers ?? []).map((item, index) => (
                <div key={index} className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm leading-tight">{item.question}</h4>
                    {item.score !== undefined && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.score} pts</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-2">{item.answer || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="size-5 text-gray-400" />
              Notes & Comments
            </h2>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{c.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.authorName} • {c.stage}</p>
                </div>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none mb-3 bg-yellow-50/30"
              placeholder="Add your notes about this candidate here..."
            />
            <Button className="w-full gap-2" onClick={handleSaveNote} disabled={!notes.trim()}>
              <Send className="size-4" /> Save Note
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-gray-400" />
              Interview History
            </h2>
            {interviews.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">No interviews scheduled yet. Use the Interviews page to schedule one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((iv) => (
                  <div key={iv.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{new Date(iv.scheduledAt).toLocaleString()}</span>
                      <StatusBadge status={iv.status} size="sm" />
                    </div>
                    <p className="text-gray-500 text-xs">
                      {iv.mode} • Panel: {iv.panel.map((p) => p.name).join(', ') || '—'}
                      {iv.result && <> • Result: <span className="font-medium">{iv.result}</span></>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reference checks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="size-5 text-gray-400" />
                Reference Checks
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowRefForm(!showRefForm)}>
                {showRefForm ? 'Cancel' : 'Add Referee'}
              </Button>
            </div>

            {showRefForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="text"
                  value={refForm.name}
                  onChange={(e) => setRefForm({ ...refForm, name: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                  placeholder="Referee name *"
                />
                <input
                  type="email"
                  value={refForm.email}
                  onChange={(e) => setRefForm({ ...refForm, email: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                  placeholder="Referee email *"
                />
                <input
                  type="text"
                  value={refForm.organization}
                  onChange={(e) => setRefForm({ ...refForm, organization: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                  placeholder="Organization"
                />
                <input
                  type="text"
                  value={refForm.relationship}
                  onChange={(e) => setRefForm({ ...refForm, relationship: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                  placeholder="Relationship (e.g. former manager)"
                />
                <Button className="w-full" size="sm" onClick={handleCreateReferenceCheck}>
                  Generate Reference Email
                </Button>
              </div>
            )}

            {/* Referees the candidate listed on their application */}
            {(application.referees ?? []).length > 0 && referenceChecks.length === 0 && !showRefForm && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Referees from application</p>
                {(application.referees ?? []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5">
                    <span className="text-gray-700">{r.name} <span className="text-gray-400">({r.email})</span></span>
                    <button
                      className="text-blue-600 hover:underline text-xs"
                      onClick={() => { setRefForm({ name: r.name, email: r.email, organization: r.organization || '', relationship: r.relationship || '' }); setShowRefForm(true); }}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}

            {referenceChecks.length === 0 && !showRefForm ? (
              <p className="text-sm text-gray-500">No reference checks yet.</p>
            ) : (
              <div className="space-y-3">
                {referenceChecks.map((check) => (
                  <div key={check.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{check.referee.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${check.status === 'responded' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {check.status === 'responded' ? 'Responded' : 'Awaiting response'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{check.referee.email}{check.referee.organization ? ` • ${check.referee.organization}` : ''}</p>
                    {check.response ? (
                      <p className="text-gray-700 text-xs bg-white border border-gray-100 rounded p-2 whitespace-pre-line">{check.response}</p>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          className="text-blue-600 hover:underline text-xs"
                          href={`mailto:${check.referee.email}?subject=${encodeURIComponent(`Reference check — ${application.candidateName}`)}&body=${encodeURIComponent(check.emailBody)}`}
                        >
                          Open email draft
                        </a>
                        <button className="text-blue-600 hover:underline text-xs" onClick={() => handleRecordResponse(check)}>
                          Record response
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
