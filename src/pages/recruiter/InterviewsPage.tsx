import { useEffect, useState } from 'react';
import { Search, Filter, CalendarPlus, UserCheck, Video, MapPin, Clock, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Application, getAllApplications } from '../../services/applicationService';
import {
  Interview,
  scheduleInterview,
  getInterviews,
  recordPanelScore,
  completeInterview,
  cancelInterview,
  averageScore,
} from '../../services/interviewService';

interface Staff {
  id: string;
  name: string;
}

export function InterviewsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  // Scheduling modal state
  const [showSchedule, setShowSchedule] = useState(false);
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState({
    applicationId: '',
    scheduledAt: '',
    durationMinutes: 60,
    mode: 'video' as Interview['mode'],
    locationOrLink: '',
    panelIds: [] as string[],
    questions: '',
  });
  const [saving, setSaving] = useState(false);

  // Manage modal state
  const [managing, setManaging] = useState<Interview | null>(null);
  const [myScore, setMyScore] = useState<number>(70);
  const [myComments, setMyComments] = useState('');
  const [result, setResult] = useState<'recommended' | 'not-recommended' | 'on-hold'>('recommended');
  const [resultNotes, setResultNotes] = useState('');

  const load = () => {
    setLoading(true);
    getInterviews()
      .then(setInterviews)
      .catch((err) => console.error('Failed to load interviews', err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openScheduler = async () => {
    setShowSchedule(true);
    try {
      const [apps, usersSnap] = await Promise.all([
        getAllApplications(),
        getDocs(collection(db, 'Users')),
      ]);
      setCandidates(apps.filter((a) => ['shortlisted', 'interview'].includes(a.status)));
      setStaff(
        usersSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => u.role !== 'candidate')
          .map((u) => ({ id: u.id, name: u.name || u.email }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSchedule = async () => {
    if (!user) return;
    const application = candidates.find((c) => c.id === form.applicationId);
    if (!application || !form.scheduledAt || form.panelIds.length === 0) {
      alert('Select a candidate, date/time and at least one panel member.');
      return;
    }
    setSaving(true);
    try {
      await scheduleInterview(
        {
          application,
          scheduledAt: form.scheduledAt,
          durationMinutes: form.durationMinutes,
          mode: form.mode,
          locationOrLink: form.locationOrLink,
          panel: form.panelIds.map((id) => ({ id, name: staff.find((s) => s.id === id)?.name || id })),
          questions: form.questions.split('\n').map((q) => q.trim()).filter(Boolean),
        },
        user
      );
      setShowSchedule(false);
      setForm({ applicationId: '', scheduledAt: '', durationMinutes: 60, mode: 'video', locationOrLink: '', panelIds: [], questions: '' });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to schedule interview.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScore = async () => {
    if (!managing || !user) return;
    await recordPanelScore(managing, {
      panelistId: user.id,
      panelistName: user.name,
      score: myScore,
      comments: myComments,
    });
    load();
    alert('Score recorded.');
  };

  const handleComplete = async () => {
    if (!managing || !user) return;
    await completeInterview(managing, result, resultNotes, user);
    setManaging(null);
    load();
  };

  const handleCancel = async () => {
    if (!managing || !user) return;
    if (!confirm('Cancel this interview?')) return;
    await cancelInterview(managing.id, user);
    setManaging(null);
    load();
  };

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Interviews</h1>
          <p className="text-gray-500">Schedule, coordinate, and track all candidate interviews and panel feedback.</p>
        </div>
        <Button className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl" onClick={openScheduler}>
          <CalendarPlus className="size-4" />
          Schedule Interview
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate or job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Button variant="outline" className="rounded-xl">
            <Filter className="size-4 mr-2" />
            More Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate / Job</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Panel</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Score</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading interviews…</td></tr>
              )}
              {!loading && filteredInterviews.map((interview) => {
                const avg = averageScore(interview);
                return (
                  <tr key={interview.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{interview.candidateName}</span>
                        <span className="text-xs text-gray-500">{interview.jobTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(interview.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="size-3" />
                          {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.durationMinutes} mins)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {interview.mode === 'video' ? (
                          <span className="inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            <Video className="size-3" /> Video Call
                          </span>
                        ) : (
                          <span className="inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                            <MapPin className="size-3" /> {interview.mode === 'phone' ? 'Phone' : 'In-Person'}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 truncate max-w-[150px]">{interview.locationOrLink}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {interview.panel.slice(0, 2).map((member, i) => (
                            <div key={i} className="size-6 rounded-full bg-orange-100 border border-white text-orange-800 flex items-center justify-center text-[10px] font-bold" title={member.name}>
                              {member.name.charAt(0)}
                            </div>
                          ))}
                          {interview.panel.length > 2 && (
                            <div className="size-6 rounded-full bg-gray-100 border border-white text-gray-600 flex items-center justify-center text-[10px] font-bold">
                              +{interview.panel.length - 2}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600">{interview.panel.length} Interviewer{interview.panel.length !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 w-fit rounded-md text-xs font-medium border ${interview.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : interview.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {interview.status === 'scheduled' ? <CalendarPlus className="size-3" /> : <UserCheck className="size-3" />}
                          {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          Scores: {interview.scores.length}/{interview.panel.length}
                          {avg !== null && <> • Avg: <span className="text-gray-800 font-bold">{avg}</span></>}
                          {interview.result && <> • {interview.result}</>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 px-3"
                        onClick={() => {
                          setManaging(interview);
                          const mine = interview.scores.find((s) => s.panelistId === user?.id);
                          setMyScore(mine?.score ?? 70);
                          setMyComments(mine?.comments ?? '');
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredInterviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CalendarPlus className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No interviews found</p>
                    <p className="text-sm text-gray-500 mt-1">Schedule one from a shortlisted candidate.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Schedule Interview</h2>
              <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate (shortlisted) *</label>
                <select
                  value={form.applicationId}
                  onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="">Select candidate…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.candidateName} — {c.jobTitle}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value as Interview['mode'] })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                  >
                    <option value="video">Video</option>
                    <option value="in-person">In person</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label>
                  <input
                    type="text"
                    value={form.locationOrLink}
                    onChange={(e) => setForm({ ...form, locationOrLink: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                    placeholder="Room A / meet.google.com/…"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Panel members *</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {staff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.panelIds.includes(s.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            panelIds: e.target.checked
                              ? [...form.panelIds, s.id]
                              : form.panelIds.filter((id) => id !== s.id),
                          })
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                  {staff.length === 0 && <p className="text-xs text-gray-400">Loading staff…</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview questions (one per line)</label>
                <textarea
                  value={form.questions}
                  onChange={(e) => setForm({ ...form, questions: e.target.value })}
                  className="w-full h-24 p-2.5 border border-gray-200 rounded-lg outline-none resize-none"
                  placeholder={'Tell us about yourself\nDescribe a challenging project…'}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
              <Button className="bg-autumn-primary hover:bg-autumn-dark text-white" disabled={saving} onClick={handleSchedule}>
                {saving ? 'Scheduling…' : 'Schedule & Notify'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {managing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{managing.candidateName}</h2>
                <p className="text-sm text-gray-500">{managing.jobTitle} • {new Date(managing.scheduledAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setManaging(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {managing.questions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Interview Questions</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {managing.questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Panel Scores</h3>
                {managing.scores.length === 0 && <p className="text-sm text-gray-500 mb-2">No scores recorded yet.</p>}
                <div className="space-y-2 mb-3">
                  {managing.scores.map((s, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{s.panelistName}</span>
                        <span className="font-bold">{s.score}/100</span>
                      </div>
                      {s.comments && <p className="text-gray-600 text-xs mt-1">{s.comments}</p>}
                    </div>
                  ))}
                </div>
                {managing.status === 'scheduled' && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">My score</h4>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={myScore}
                        onChange={(e) => setMyScore(Number(e.target.value))}
                        className="w-20 p-2 border border-gray-200 rounded-lg text-center font-bold outline-none"
                      />
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                    <textarea
                      value={myComments}
                      onChange={(e) => setMyComments(e.target.value)}
                      className="w-full h-20 p-2.5 border border-gray-200 rounded-lg outline-none resize-none text-sm"
                      placeholder="Detailed comments…"
                    />
                    <Button size="sm" onClick={handleSaveScore}>Save my score</Button>
                  </div>
                )}
              </div>

              {managing.status === 'scheduled' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Complete Interview</h3>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="not-recommended">Not recommended</option>
                    <option value="on-hold">On hold</option>
                  </select>
                  <textarea
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    className="w-full h-20 p-2.5 border border-gray-200 rounded-lg outline-none resize-none text-sm"
                    placeholder="Summary / report notes…"
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleComplete}>
                      Mark Completed
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleCancel}>
                      Cancel Interview
                    </Button>
                  </div>
                </div>
              )}
              {managing.status === 'completed' && managing.notes && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Interview Report</h3>
                  <p className="text-sm text-gray-600">Result: <span className="font-medium">{managing.result}</span></p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{managing.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
