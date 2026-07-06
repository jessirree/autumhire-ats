import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { promptText } from '../../components/ui/confirm-dialog';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  Requisition,
  PRIORITY_STYLES,
  getRequisitions,
  confirmRequisition,
  returnToRecruiter,
} from '../../services/requisitionService';
import { Application, getAllApplications } from '../../services/applicationService';
import { Offer, getOffersPendingApproval } from '../../services/offerService';
import { Interview, getInterviews } from '../../services/interviewService';

export function HiringManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.name || 'there';
  const [activeTab, setActiveTab] = useState<'requisitions' | 'approvals' | 'candidates'>('requisitions');

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<Requisition[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [pipeline, setPipeline] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [positionFilter, setPositionFilter] = useState('all');

  const load = async () => {
    if (!user) return;
    try {
      const [reqs, offers, apps, ivs] = await Promise.all([
        getRequisitions(),
        getOffersPendingApproval(user.id),
        getAllApplications(),
        getInterviews(),
      ]);
      setRequisitions(reqs);
      setPendingConfirmations(
        reqs.filter((r) => r.status === 'pending-confirmation' && r.createdById === user.id)
      );
      setPendingOffers(offers);
      setPipeline(apps.filter((a) => ['shortlisted', 'interview', 'offer'].includes(a.status)));
      setInterviews(ivs.filter((iv) => iv.status === 'scheduled'));
    } catch (err) {
      console.error('Failed to load dashboard', err);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleConfirm = async (req: Requisition) => {
    if (!user) return;
    try {
      await confirmRequisition(req, user, false);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = getGreeting();
  const pendingApprovals = pendingConfirmations.length + pendingOffers.length;
  const candidatesWaiting = pipeline.length;
  const displayJob = pipeline.length > 0 ? pipeline[0].jobTitle : 'your pending';

  const visiblePipeline = positionFilter === 'all' ? pipeline : pipeline.filter((c) => c.jobTitle === positionFilter);
  const positionTitles = Array.from(new Set(pipeline.map((c) => c.jobTitle)));
  const interviewFor = (app: Application) => interviews.find((iv) => iv.applicationId === app.id);

  return (
    <div className="p-8 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-autumn-charcoal mb-2">
          {greeting} {userName}!
        </h1>
        <p className="text-gray-600">
          You have <span className="font-semibold text-autumn-orange">{pendingApprovals} item{pendingApprovals === 1 ? '' : 's'}</span> pending your approval and <span className="font-semibold text-autumn-orange">{candidatesWaiting} candidate{candidatesWaiting === 1 ? '' : 's'}</span> in the pipeline{pipeline.length > 0 ? ` including the ${displayJob} role` : ''}.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Requisitions</p>
              <p className="text-3xl font-bold text-autumn-orange">{requisitions.length}</p>
            </div>
            <div className="p-3 bg-orange-50 text-autumn-orange rounded-xl">
              <Clock className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Pending Approvals</p>
              <p className="text-3xl font-bold text-autumn-yellow">{pendingApprovals}</p>
            </div>
            <div className="p-3 bg-yellow-50 text-autumn-yellow rounded-xl">
              <Clock className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">In Pipeline</p>
              <p className="text-3xl font-bold text-autumn-green">{pipeline.length}</p>
            </div>
            <div className="p-3 bg-green-50 text-autumn-green rounded-xl">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50">
          <div className="flex px-4 pt-2">
            {[
              { id: 'requisitions', label: 'My Requisitions' },
              { id: 'approvals', label: 'Approvals Pending' },
              { id: 'candidates', label: 'Candidate Pipeline' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-all duration-200 ${activeTab === tab.id
                  ? 'border-autumn-orange text-autumn-orange bg-white rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-t-lg'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'requisitions' && (
            <div className="space-y-4">
              {requisitions.length === 0 && (
                <p className="text-center text-gray-500 py-8">No requisitions yet.</p>
              )}
              {requisitions.map((req) => (
                <div key={req.id} className="group border border-gray-100 hover:border-autumn-orange/30 rounded-xl p-5 bg-white transition-all hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-autumn-orange transition-colors">{req.positionTitle}</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {req.department} • {req.vacancies} position(s) • {req.referenceNumber}
                      </p>
                    </div>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-3">
                    <p className="text-xs text-gray-400 font-medium">
                      Raised by {req.createdByName} • Priority: {(PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.medium).label}
                    </p>
                    <Button variant="outline" size="sm" className="hover:text-autumn-orange hover:border-autumn-orange" onClick={() => navigate('/hiring/requisitions')}>View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {pendingConfirmations.length === 0 && pendingOffers.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nothing is waiting for your approval.</p>
              )}
              {pendingConfirmations.map((req) => {
                const pr = PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.medium;
                return (
                  <div key={req.id} className={`group border border-gray-100 hover:border-yellow-200 rounded-xl p-5 bg-white transition-all hover:shadow-md ${pr.row}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-autumn-yellow text-xs font-semibold uppercase tracking-wide">Awaiting Your Confirmation</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pr.badge}`}>{pr.label}</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{req.positionTitle} • Grade {req.grade}</h3>
                        <p className="text-sm text-gray-500">
                          {req.department} • {req.vacancies} vacanc{req.vacancies === 1 ? 'y' : 'ies'} • {req.referenceNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="bg-autumn-green hover:bg-forest-green text-white shadow-sm"
                        onClick={() => handleConfirm(req)}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturn(req)}
                        className="text-autumn-red border-autumn-red/20 hover:bg-red-50 hover:text-autumn-red hover:border-autumn-red"
                      >
                        <XCircle className="size-4 mr-2" />
                        Return to Recruiter
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate('/hiring/requisitions')}>
                        View Details / Skip Options
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pendingOffers.map((offer) => (
                <div key={offer.id} className="group border border-gray-100 hover:border-yellow-200 rounded-xl p-5 bg-white transition-all hover:shadow-md border-l-4 border-l-autumn-yellow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-autumn-yellow text-xs font-semibold uppercase tracking-wide">Pending Approval</span>
                        <span className="text-sm font-medium text-gray-500">• Offer Letter</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{offer.candidateName} — {offer.jobTitle}</h3>
                      <p className="text-sm text-gray-500">
                        Prepared by <span className="font-medium text-gray-700">{offer.createdByName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate('/hiring/approvals')}>Review Offer</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-orange/50 min-w-[240px]"
                >
                  <option value="all">All Positions</option>
                  {positionTitles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{visiblePipeline.length}</span> candidates
                </div>
              </div>
              <div className="space-y-4">
                {visiblePipeline.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No candidates in the pipeline yet.</p>
                )}
                {visiblePipeline.map((candidate) => {
                  const iv = interviewFor(candidate);
                  return (
                    <div key={candidate.id} className="group border border-gray-100 hover:border-autumn-green/30 rounded-xl p-5 bg-white transition-all hover:shadow-md">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="size-12 bg-gradient-to-br from-green-50 to-green-100 text-autumn-green rounded-full flex items-center justify-center font-bold text-lg border border-green-200 shadow-sm">
                            {candidate.candidateName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-autumn-green transition-colors">{candidate.candidateName}</h3>
                            <p className="text-sm text-gray-500">{candidate.jobTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Score</p>
                            <p className="text-xl font-bold text-autumn-charcoal">{candidate.prescreenScore}</p>
                          </div>
                          <StatusBadge status={candidate.status} size="sm" />
                        </div>
                      </div>
                      {iv && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mb-4 w-fit">
                          <Clock className="size-4 text-autumn-orange" />
                          <span>Interview scheduled: <span className="font-medium">{new Date(iv.scheduledAt).toLocaleString()}</span></span>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 hover:text-autumn-orange hover:border-autumn-orange"
                          onClick={() => navigate(`/hiring/candidate-detail/${candidate.id}`)}
                        >
                          View Profile & Add Feedback
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

