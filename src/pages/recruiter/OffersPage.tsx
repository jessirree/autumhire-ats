import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Filter, Mail, DollarSign, Clock, FileCheck, Plus, X, CheckCircle2, XCircle, Download } from 'lucide-react';
import { getApplicationById } from '../../services/applicationService';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { confirm } from '../../components/ui/confirm-dialog';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Application, getAllApplications } from '../../services/applicationService';
import {
  Offer,
  OfferStatus,
  createOffer,
  getOffers,
  sendOffer,
  recordOfferDecision,
  finalizeHire,
} from '../../services/offerService';

const STATUS_LABELS: Record<OfferStatus, string> = {
  'pending-approval': 'Pending Approval',
  approved: 'Approved',
  'declined-approval': 'Approval Declined',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
};

export function OffersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Create-offer modal
  const [showCreate, setShowCreate] = useState(false);
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [approvers, setApprovers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ applicationId: '', salary: '', currency: 'KES', startDate: '', notes: '', approverId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getOffers()
      .then(setOffers)
      .catch((err) => console.error('Failed to load offers', err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const [apps, usersSnap] = await Promise.all([
        getAllApplications(),
        getDocs(collection(db, 'Users')),
      ]);
      setCandidates(apps.filter((a) => ['interview', 'shortlisted', 'offer'].includes(a.status)));
      setApprovers(
        usersSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => ['hiring-manager', 'admin'].includes(u.role))
          .map((u) => ({ id: u.id, name: u.name || u.email }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    const application = candidates.find((c) => c.id === form.applicationId);
    if (!application) { toast.error('Select a candidate.'); return; }
    setSaving(true);
    try {
      const approver = approvers.find((a) => a.id === form.approverId);
      await createOffer(
        { application, salary: form.salary, currency: form.currency, startDate: form.startDate, notes: form.notes, approver },
        user
      );
      setShowCreate(false);
      setForm({ applicationId: '', salary: '', currency: 'KES', startDate: '', notes: '', approverId: '' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create offer.');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (offer: Offer) => {
    if (!user) return;
    await sendOffer(offer, user);
    load();
  };

  const handleFinalizeHire = async (offer: Offer) => {
    if (!user) return;
    const regrets = await confirm({
      title: `Finalize the hire of ${offer.candidateName}?`,
      description: 'The application will be marked as Hired. You can also send regret notifications to the remaining candidates for this job.',
      confirmText: 'Hire & send regrets',
      cancelText: 'Hire only',
    });
    try {
      await finalizeHire(offer, user, { sendRegrets: regrets });
      load();
      toast.success('Hire finalized — application marked as Hired.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to finalize hire.');
    }
  };

  const handleDecision = async (offer: Offer, decision: 'accepted' | 'rejected') => {
    if (!user) return;
    const regrets = decision === 'accepted'
      ? await confirm({ title: `${offer.candidateName} accepted — also send regret notifications to the remaining candidates for this job?` })
      : false;
    try {
      await recordOfferDecision(offer, decision, user, { sendRegrets: regrets });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record decision.');
    }
  };

  // Onboarding handoff: export accepted offers + candidate bio data as CSV.
  const handleExportHired = async () => {
    const accepted = offers.filter((o) => o.status === 'accepted');
    if (accepted.length === 0) {
      toast.error('No accepted offers to export yet.');
      return;
    }
    const rows: string[][] = [
      ['Candidate', 'Email', 'Phone', 'Position', 'Department', 'Salary', 'Start date', 'Gender', 'Nationality', 'City', 'Country', 'Date of birth'],
    ];
    for (const offer of accepted) {
      const app = await getApplicationById(offer.applicationId).catch(() => null);
      rows.push([
        offer.candidateName, offer.candidateEmail, app?.phone ?? '', offer.jobTitle,
        app?.department ?? '', `${offer.currency ?? ''} ${offer.salary ?? ''}`.trim(), offer.startDate ?? '',
        app?.gender ?? '', app?.nationality ?? '', app?.city ?? '', app?.country ?? '', app?.dateOfBirth ?? '',
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-handoff-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Offers</h1>
          <p className="text-gray-500">Manage candidates at the offer stage, track responses, and send offer letters.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExportHired}>
            <Download className="size-4" />
            Export Hired (Onboarding)
          </Button>
          <Button className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl" onClick={openCreate}>
            <Plus className="size-4" />
            New Offer
          </Button>
        </div>
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
            <option value="pending-approval">Pending Approval</option>
            <option value="approved">Approved (Ready to Send)</option>
            <option value="sent">Sent (Pending Response)</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Declined</option>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compensation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading offers…</td></tr>
              )}
              {!loading && filteredOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{offer.candidateName}</span>
                      <span className="text-sm text-gray-800 font-medium mt-0.5">{offer.jobTitle}</span>
                      <span className="text-xs text-gray-500">{offer.candidateEmail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-700 font-bold border border-green-100">
                      <DollarSign className="size-3" />
                      {offer.currency} {offer.salary || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FileCheck className="size-3.5 text-blue-500" />
                        Created: {offer.createdAt?.toDate ? offer.createdAt.toDate().toLocaleDateString() : '—'}
                      </div>
                      {offer.startDate && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-100">
                          <Clock className="size-3.5" /> Start: {offer.startDate}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 w-fit rounded-md text-xs font-bold border
                      ${offer.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                        offer.status === 'rejected' || offer.status === 'declined-approval' ? 'bg-red-100 text-red-800 border-red-200' :
                        offer.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        offer.status === 'pending-approval' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {STATUS_LABELS[offer.status] ?? offer.status}
                    </span>
                    {offer.approverName && offer.status === 'pending-approval' && (
                      <p className="text-xs text-gray-400 mt-1">Awaiting: {offer.approverName}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {offer.status === 'approved' && (
                        <Button
                          size="sm"
                          className="h-8 bg-autumn-primary hover:bg-autumn-dark text-white px-3 gap-1.5"
                          onClick={() => handleSend(offer)}
                        >
                          <Mail className="size-3.5" /> Send Offer
                        </Button>
                      )}
                      {offer.status === 'accepted' && (
                        <Button
                          size="sm"
                          className="h-8 bg-green-600 hover:bg-green-700 text-white px-3 gap-1.5"
                          onClick={() => handleFinalizeHire(offer)}
                        >
                          <CheckCircle2 className="size-3.5" /> Complete Hire
                        </Button>
                      )}
                      {offer.status === 'sent' && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700 text-white px-3 gap-1.5"
                            onClick={() => handleDecision(offer, 'accepted')}
                          >
                            <CheckCircle2 className="size-3.5" /> Mark Accepted
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-200 text-red-600 hover:bg-red-50 px-3 gap-1.5"
                            onClick={() => handleDecision(offer, 'rejected')}
                          >
                            <XCircle className="size-3.5" /> Mark Declined
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredOffers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileCheck className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No offers found</p>
                    <p className="text-sm text-gray-500 mt-1">Create an offer for a candidate who passed interviews.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">New Offer</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                <select
                  value={form.applicationId}
                  onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="">Select candidate…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.candidateName} — {c.jobTitle} ({c.status})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                  >
                    <option>KES</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="text"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                    placeholder="e.g. 250,000 / month"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approver (hiring manager)</label>
                <select
                  value={form.approverId}
                  onChange={(e) => setForm({ ...form, approverId: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="">No approval needed</option>
                  {approvers.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full h-20 p-2.5 border border-gray-200 rounded-lg outline-none resize-none"
                  placeholder="Benefits, conditions, probation…"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="bg-autumn-primary hover:bg-autumn-dark text-white" disabled={saving} onClick={handleCreate}>
                {saving ? 'Creating…' : 'Create Offer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
