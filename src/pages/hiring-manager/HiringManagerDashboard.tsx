import { useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface Requisition {
  id: string;
  jobTitle: string;
  department: string;
  positions: number;
  status: string;
  createdDate: string;
  applicants: number;
}

interface Approval {
  id: string;
  type: string;
  jobTitle: string;
  requestedBy: string;
  date: string;
}

interface Candidate {
  id: string;
  name: string;
  jobTitle: string;
  stage: string;
  score: number;
  interviewDate?: string;
}

const mockRequisitions: Requisition[] = [
  {
    id: '1',
    jobTitle: 'Senior Frontend Developer',
    department: 'Engineering',
    positions: 2,
    status: 'Active',
    createdDate: '2026-01-15',
    applicants: 45,
  },
  {
    id: '2',
    jobTitle: 'Product Manager',
    department: 'Product',
    positions: 1,
    status: 'Active',
    createdDate: '2026-01-20',
    applicants: 78,
  },
  {
    id: '3',
    jobTitle: 'UX Designer',
    department: 'Design',
    positions: 1,
    status: 'Draft',
    createdDate: '2026-02-05',
    applicants: 0,
  },
];

const mockApprovals: Approval[] = [
  {
    id: '1',
    type: 'Job Requisition',
    jobTitle: 'Backend Engineer',
    requestedBy: 'Sarah Lee',
    date: '2026-02-10',
  },
  {
    id: '2',
    type: 'Offer Letter',
    jobTitle: 'Data Analyst',
    requestedBy: 'Mike Anderson',
    date: '2026-02-09',
  },
];

const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    jobTitle: 'Senior Frontend Developer',
    stage: 'Shortlisted',
    score: 92,
    interviewDate: '2026-02-12',
  },
  {
    id: '2',
    name: 'Michael Chen',
    jobTitle: 'Product Manager',
    stage: 'Interview',
    score: 88,
    interviewDate: '2026-02-13',
  },
  {
    id: '3',
    name: 'Emma Williams',
    jobTitle: 'Senior Frontend Developer',
    stage: 'Shortlisted',
    score: 85,
  },
];

export function HiringManagerDashboard() {
  const { user } = useAuth();
  const userName = user?.name || 'there';
  const [activeTab, setActiveTab] = useState<'requisitions' | 'approvals' | 'candidates'>('requisitions');

  const handleApprove = (id: string) => {
    console.log('Approved:', id);
    // Logic to update approval status would go here
  };

  const handleReject = (id: string) => {
    console.log('Rejected:', id);
    // Logic to update approval status would go here
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = getGreeting();
  const pendingApprovals = mockApprovals.length;
  // Assuming 'mockCandidates' represents candidates waiting for feedback or action
  const candidatesWaiting = mockCandidates.length;
  const displayJob = mockCandidates.length > 0 ? mockCandidates[0].jobTitle : 'your pending';

  return (
    <div className="p-8 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-autumn-charcoal mb-2">
          {greeting} {userName}!
        </h1>
        <p className="text-gray-600">
          You have <span className="font-semibold text-autumn-orange">{pendingApprovals} job requisitions</span> pending your approval and <span className="font-semibold text-autumn-orange">{candidatesWaiting} candidates</span> waiting for feedback on the {displayJob} role.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">My Requisitions</p>
              <p className="text-3xl font-bold text-autumn-orange">3</p>
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
              <p className="text-3xl font-bold text-autumn-yellow">{mockApprovals.length}</p>
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
              <p className="text-3xl font-bold text-autumn-green">{mockCandidates.length}</p>
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
              {mockRequisitions.map((req) => (
                <div key={req.id} className="group border border-gray-100 hover:border-autumn-orange/30 rounded-xl p-5 bg-white transition-all hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-autumn-orange transition-colors">{req.jobTitle}</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {req.department} â€¢ {req.positions} position(s)
                      </p>
                    </div>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-3">
                    <p className="text-xs text-gray-400 font-medium">
                      Created {new Date(req.createdDate).toLocaleDateString()} â€¢ {req.applicants} applicants
                    </p>
                    <Button variant="outline" size="sm" className="hover:text-autumn-orange hover:border-autumn-orange">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {mockApprovals.map((approval) => (
                <div key={approval.id} className="group border border-gray-100 hover:border-yellow-200 rounded-xl p-5 bg-white transition-all hover:shadow-md border-l-4 border-l-autumn-yellow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-autumn-yellow text-xs font-semibold uppercase tracking-wide">Pending Approval</span>
                        <span className="text-sm font-medium text-gray-500">â€¢ {approval.type}</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{approval.jobTitle}</h3>
                      <p className="text-sm text-gray-500">
                        Requested by <span className="font-medium text-gray-700">{approval.requestedBy}</span> on {new Date(approval.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      className="bg-autumn-green hover:bg-forest-green text-white shadow-sm"
                      onClick={() => handleApprove(approval.id)}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(approval.id)}
                      className="text-autumn-red border-autumn-red/20 hover:bg-red-50 hover:text-autumn-red hover:border-autumn-red"
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <select className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-orange/50 min-w-[240px]">
                  <option>All Positions</option>
                  <option>Senior Frontend Developer</option>
                  <option>Product Manager</option>
                </select>
                <div className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{mockCandidates.length}</span> candidates
                </div>
              </div>
              <div className="space-y-4">
                {mockCandidates.map((candidate) => (
                  <div key={candidate.id} className="group border border-gray-100 hover:border-autumn-green/30 rounded-xl p-5 bg-white transition-all hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-gradient-to-br from-green-50 to-green-100 text-autumn-green rounded-full flex items-center justify-center font-bold text-lg border border-green-200 shadow-sm">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-autumn-green transition-colors">{candidate.name}</h3>
                          <p className="text-sm text-gray-500">{candidate.jobTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Score</p>
                          <p className="text-xl font-bold text-autumn-charcoal">{candidate.score}</p>
                        </div>
                        <StatusBadge status={candidate.stage} size="sm" />
                      </div>
                    </div>
                    {candidate.interviewDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mb-4 w-fit">
                        <Clock className="size-4 text-autumn-orange" />
                        <span>Interview scheduled: <span className="font-medium">{new Date(candidate.interviewDate).toLocaleDateString()}</span></span>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <Button size="sm" className="bg-autumn-green hover:bg-forest-green text-white shadow-sm flex-1">
                        Move to Next Stage
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 hover:text-autumn-orange hover:border-autumn-orange">View Profile</Button>
                      <Button variant="outline" size="sm" className="flex-1 hover:text-autumn-orange hover:border-autumn-orange">Add Feedback</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

