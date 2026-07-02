import { useState, useMemo } from 'react';
import { Search, Filter, Download, Briefcase, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  activeApplications: { jobTitle: string, stage: string }[];
  assignedRecruiter: string;
  inTalentPool: boolean;
  lastContact: string;
}

const mockCandidates: CandidateProfile[] = [
  {
    id: 'CAN-001',
    name: 'Michael Chen',
    email: 'michael.c@example.com',
    phone: '+1 (555) 012-3456',
    location: 'San Francisco, CA',
    currentRole: 'Senior Frontend Developer',
    activeApplications: [{ jobTitle: 'Lead UI Engineer', stage: 'interview' }],
    assignedRecruiter: 'Sarah Lee',
    inTalentPool: true,
    lastContact: '2024-03-01'
  },
  {
    id: 'CAN-002',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 987-6543',
    location: 'New York, NY',
    currentRole: 'Product Owner',
    activeApplications: [{ jobTitle: 'Product Manager', stage: 'offer' }],
    assignedRecruiter: 'Alex Rivers',
    inTalentPool: false,
    lastContact: '2024-03-02'
  },
  {
    id: 'CAN-003',
    name: 'David Miller',
    email: 'david.m@example.com',
    phone: '+1 (555) 456-7890',
    location: 'London, UK',
    currentRole: 'UX Designer',
    activeApplications: [
      { jobTitle: 'Senior UX Designer', stage: 'rejected' },
      { jobTitle: 'Product Designer', stage: 'screening' }
    ],
    assignedRecruiter: 'Sarah Lee',
    inTalentPool: true,
    lastContact: '2024-02-28'
  },
  {
    id: 'CAN-004',
    name: 'Emma Williams',
    email: 'emma.w@example.com',
    phone: '+44 7700 900077',
    location: 'Remote',
    currentRole: 'Data Scientist',
    activeApplications: [],
    assignedRecruiter: 'Unassigned',
    inTalentPool: true,
    lastContact: '2023-11-15'
  }
];

interface CandidatesPageProps {
  onViewCandidate: (id: string) => void;
  onExportData?: () => void;
}

export function CandidatesPage({ 
  onViewCandidate, 
  onExportData = () => alert('Exporting candidates data...')
}: CandidatesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [poolFilter, setPoolFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredCandidates = useMemo(() => {
    return mockCandidates.filter(candidate => {
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
      
      return matchesSearch && matchesPool && matchesJob && matchesStage;
    });
  }, [searchTerm, poolFilter, jobFilter, stageFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Candidates CRM</h1>
          <p className="text-gray-500">Manage all candidates, talent pools, and cross-job interactions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={onExportData}>
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
            <option value="Lead UI Engineer">Lead UI Engineer</option>
            <option value="Product Manager">Product Manager</option>
            <option value="Senior UX Designer">Senior UX Designer</option>
            <option value="Product Designer">Product Designer</option>
          </select>
          
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Stages</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <Button variant="outline" className="rounded-xl">
            <Filter className="size-4 mr-2" />
            More Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-gray-50/30">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-gray-100 relative">
                <div className="absolute top-4 right-4 text-xs font-semibold text-gray-500">
                  {candidate.lastContact}
                </div>
                <div className="size-14 bg-gradient-to-br from-orange-100 to-amber-100 text-autumn-charcoal rounded-full flex items-center justify-center font-bold text-xl mb-4 shadow-sm border border-orange-200">
                  {candidate.name.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{candidate.name}</h3>
                <p className="text-autumn-primary font-medium text-sm flex items-center gap-1 mt-1">
                  <Briefcase className="size-3.5" />
                  <span className="line-clamp-1">{candidate.currentRole}</span>
                </p>
                
                {candidate.inTalentPool && (
                  <span className="inline-flex mt-3 items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                    Talent Pool
                  </span>
                )}
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
          {filteredCandidates.length === 0 && (
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
                  alert('Candidate added successfully!');
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

