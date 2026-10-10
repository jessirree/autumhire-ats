import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Download, Briefcase, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { SortButton } from '../../components/ats/SortableHeader';
import { sortRows, useTableSort, SortColumn } from '../../lib/tableSort';
import { Application, getAllApplications } from '../../services/applicationService';
import { downloadCsv } from '../../lib/exportCsv';

interface CandidateProfile {
  id: string; // latest application id (used for View Profile navigation)
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  activeApplications: { jobTitle: string, stage: string }[];
  assignedRecruiter: string;
  inTalentPool: boolean;
  lastContact: string;
  prescreenScore: number;
  appliedAtMs: number | null;
  panelRatingAvg: number | null;
  /** D: what Applications shows per-row, Candidates doesn't — these three are what make the pages genuinely different. */
  applicationCount: number;
  furthestStageLabel: string;
}

// Pipeline depth, not alphabetical — used to find the furthest point any of
// a candidate's applications has reached across their full statusHistory,
// not just their current status, so a later rejection doesn't erase an
// earlier interview from "how far did this person get".
const STAGE_RANK: Record<string, number> = {
  applied: 0,
  longlisted: 1,
  shortlisted: 2,
  interview: 3,
  offer: 4,
  hired: 5,
};
const STAGE_LABELS = ['Applied', 'Longlisted', 'Shortlisted', 'Interview', 'Offer', 'Hired'];

function furthestStageLabel(apps: Application[]): string {
  let maxRank = 0;
  for (const app of apps) {
    for (const entry of app.statusHistory ?? []) {
      const rank = STAGE_RANK[entry.status];
      if (rank !== undefined && rank > maxRank) maxRank = rank;
    }
  }
  return STAGE_LABELS[maxRank];
}

type SortKey = 'candidateName' | 'prescreenScore' | 'appliedAt' | 'rating';

const SORT_COLUMNS: Record<SortKey, SortColumn<CandidateProfile>> = {
  candidateName: { getValue: (c) => c.name, type: 'string' },
  prescreenScore: { getValue: (c) => c.prescreenScore },
  rating: { getValue: (c) => c.panelRatingAvg },
  appliedAt: { getValue: (c) => c.appliedAtMs },
};

const ACTIVE_STAGES = ['applied', 'longlisted', 'shortlisted', 'interview', 'offer'];

// Group applications into per-candidate CRM profiles.
function buildProfiles(applications: Application[]): CandidateProfile[] {
  const byCandidate = new Map<string, Application[]>();
  for (const app of applications) {
    const list = byCandidate.get(app.candidateId) ?? [];
    list.push(app);
    byCandidate.set(app.candidateId, list);
  }
  return Array.from(byCandidate.values()).map((apps) => {
    const latest = apps[0];
    return {
      id: latest.id,
      candidateId: latest.candidateId,
      name: latest.candidateName,
      email: latest.email,
      phone: latest.phone || '—',
      location: [latest.city, latest.country].filter(Boolean).join(', ') || '—',
      currentRole: latest.jobTitle,
      activeApplications: apps.map((a) => ({ jobTitle: a.jobTitle, stage: a.status })),
      assignedRecruiter: '—',
      inTalentPool: apps.every((a) => !ACTIVE_STAGES.includes(a.status)),
      lastContact: latest.appliedAt?.toDate ? latest.appliedAt.toDate().toLocaleDateString() : '',
      prescreenScore: latest.prescreenScore,
      appliedAtMs: latest.appliedAt?.toMillis?.() ?? null,
      panelRatingAvg: latest.panelRatingAvg ?? null,
      applicationCount: apps.length,
      furthestStageLabel: furthestStageLabel(apps),
    };
  });
}

function exportCandidatesCSV(candidates: CandidateProfile[]) {
  const headers = ['Name', 'Email', 'Phone', 'Location', 'Applications', 'Last activity'];
  const rows = candidates.map((c) => [
    c.name, c.email, c.phone, c.location,
    c.activeApplications.map((a) => `${a.jobTitle} (${a.stage})`).join('; '),
    c.lastContact,
  ]);
  downloadCsv(`candidates-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

interface CandidatesPageProps {
  onViewCandidate: (id: string) => void;
}

export function CandidatesPage({ onViewCandidate }: CandidatesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [poolFilter, setPoolFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const { sortKey, sortDir, toggleSort } = useTableSort<SortKey>('appliedAt', 'desc', ['candidateName']);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    getAllApplications()
      .then((apps) => {
        setCandidates(buildProfiles(apps));
        setJobTitles(Array.from(new Set(apps.map((a) => a.jobTitle))));
      })
      .catch((err: any) => {
        console.error('Failed to load candidates', err);
        setError(err?.message || 'Failed to load candidates.');
      });
  };

  useEffect(load, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            candidate.currentRole.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesPool = true;
      if (poolFilter === 'pool') matchesPool = candidate.inTalentPool;
      if (poolFilter === 'active') matchesPool = candidate.activeApplications.length > 0;
      
      let matchesJob = true;
      if (jobFilter !== 'all') {
        matchesJob = candidate.activeApplications.some(app => app.jobTitle === jobFilter);
      }
      
      let matchesStage = true;
      if (stageFilter !== 'all') {
        matchesStage = candidate.activeApplications.some(app => app.stage.toLowerCase() === stageFilter.toLowerCase());
      }

      const matchesRepeat = !repeatOnly || candidate.applicationCount > 1;

      return matchesSearch && matchesPool && matchesJob && matchesStage && matchesRepeat;
    });
  }, [candidates, searchTerm, poolFilter, jobFilter, stageFilter, repeatOnly]);

  const sortedCandidates = useMemo(
    () => sortRows(filteredCandidates, SORT_COLUMNS, sortKey, sortDir),
    [filteredCandidates, sortKey, sortDir]
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Candidates CRM</h1>
          <p className="text-gray-500">Manage all candidates, talent pools, and cross-job interactions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => exportCandidatesCSV(filteredCandidates)}>
            <Download className="size-4" />
            Export Data
          </Button>
          <Button className="bg-autumn-primary hover:bg-autumn-dark text-white rounded-xl" onClick={() => setIsAddModalOpen(true)}>
            Add Candidate
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or current role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>

          <select
            value={poolFilter}
            onChange={(e) => setPoolFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Candidates</option>
            <option value="active">Active Applicants</option>
            <option value="pool">Talent Pool Only</option>
          </select>
          
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Jobs</option>
            {jobTitles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Stages</option>
            <option value="applied">Applied</option>
            <option value="longlisted">Longlisted</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={repeatOnly}
              onChange={(e) => setRepeatOnly(e.target.checked)}
              className="size-4 rounded border-gray-300 text-autumn-primary focus:ring-autumn-primary"
            />
            Repeat applicants only
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort</span>
            <SortButton label="Name" sortKey="candidateName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortButton label="Score" sortKey="prescreenScore" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortButton label="Panel rating" sortKey="rating" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortButton label="Date applied" sortKey="appliedAt" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-gray-50/30">
          {sortedCandidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-gray-100 relative">
                <div className="absolute top-4 right-4 text-xs text-gray-500 text-right">
                  <span className="font-semibold">Last applied</span>
                  <br />
                  {candidate.lastContact || '—'}
                </div>
                <div className="size-14 bg-gradient-to-br from-orange-100 to-amber-100 text-autumn-charcoal rounded-full flex items-center justify-center font-bold text-xl mb-4 shadow-sm border border-orange-200">
                  {candidate.name.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{candidate.name}</h3>
                <p className="text-autumn-primary font-medium text-sm flex items-center gap-1 mt-1">
                  <Briefcase className="size-3.5" />
                  <span className="line-clamp-1">{candidate.currentRole}</span>
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {candidate.applicationCount > 1 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                      {candidate.applicationCount} applications
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                    Furthest: {candidate.furthestStageLabel}
                  </span>
                  {candidate.inTalentPool && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      Talent Pool
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="size-4 text-gray-400 shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="size-4 text-gray-400 shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="size-4 text-gray-400 shrink-0" />
                  <span className="truncate">{candidate.location}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Applications</h4>
                  {candidate.activeApplications.length > 0 ? (
                    <div className="space-y-2">
                       {candidate.activeApplications.map((app, idx) => (
                         <div key={idx} className="flex flex-col gap-1.5 p-2 bg-gray-50 rounded-lg">
                           <span className="font-medium text-gray-800 text-xs truncate">{app.jobTitle}</span>
                           <StatusBadge status={app.stage} size="sm" />
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic">No active applications</p>
                  )}
                </div>
                
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Recruiter: {candidate.assignedRecruiter}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs px-3 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 transition-colors"
                    onClick={() => onViewCandidate(candidate.id)}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {error && (
             <div className="col-span-full py-12 text-center bg-white rounded-xl border border-gray-100">
               <p className="text-red-600 font-medium mb-3">{error}</p>
               <Button variant="outline" size="sm" onClick={load}>Retry</Button>
             </div>
          )}
          {!error && sortedCandidates.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
               <div className="size-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Search className="size-6 text-gray-400" />
               </div>
               <p className="text-lg font-medium text-gray-900">No candidates found</p>
               <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search term.</p>
             </div>
          )}
        </div>
      </div>
      
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Add New Candidate</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 hover:border-autumn-primary cursor-pointer transition-colors">
                  <Download className="mx-auto size-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Drag & drop or <span className="text-autumn-primary font-medium">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX up to 5MB</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                   <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary outline-none" placeholder="First Name" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                   <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary outline-none" placeholder="Last Name" />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                 <input type="email" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary outline-none" placeholder="email@example.com" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                 <input type="tel" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary outline-none" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Current Role</label>
                 <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary outline-none" placeholder="e.g. Software Engineer" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                className="bg-autumn-primary hover:bg-autumn-dark text-white" 
                onClick={() => {
                  toast.success('Candidate added successfully!');
                  setIsAddModalOpen(false);
                }}
              >
                Save Candidate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

