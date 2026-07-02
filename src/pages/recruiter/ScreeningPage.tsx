import { useState, useMemo } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, ChevronDown, ListOrdered } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface KnockoutQuestion {
  question: string;
  answer: string;
  passed: boolean;
}

interface ScreeningResult {
  id: string;
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  knockoutQuestions: KnockoutQuestion[];
  status: 'pending' | 'passed' | 'failed';
  notes: string;
  knockoutPassed?: boolean;
}

const mockScreeningResults: ScreeningResult[] = [
  {
    id: 'SCR-001',
    candidateName: 'Michael Chen',
    jobTitle: 'Senior Frontend Developer',
    overallScore: 88,
    status: 'pending',
    notes: 'Strong technical background, but needs to clarify notice period.',
    knockoutQuestions: [
      { question: 'Do you have 5+ years of React experience?', answer: 'Yes', passed: true },
      { question: 'Are you eligible to work in the specified location?', answer: 'Yes', passed: true },
    ]
  },
  {
    id: 'SCR-002',
    candidateName: 'Sarah Jenkins',
    jobTitle: 'Product Manager',
    overallScore: 92,
    status: 'passed',
    notes: 'Exceptional answers on product strategy.',
    knockoutQuestions: [
      { question: 'Have you managed a B2B SaaS product before?', answer: 'Yes', passed: true },
    ]
  },
  {
    id: 'SCR-003',
    candidateName: 'David Miller',
    jobTitle: 'UX Designer',
    overallScore: 45,
    status: 'failed',
    notes: 'Failed knockout question regarding portfolio.',
    knockoutQuestions: [
      { question: 'Can you provide a link to your portfolio?', answer: 'No portfolio available currently.', passed: false },
    ],
    knockoutPassed: false
  }
];

export function ScreeningPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    return mockScreeningResults.filter(result => {
      const matchesSearch = result.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            result.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'passed') matchesStatus = result.knockoutPassed as unknown as boolean; // use true/false based on questions in a real app
      if (statusFilter === 'failed') matchesStatus = !(result.knockoutPassed as unknown as boolean);
      if (statusFilter === 'pending') matchesStatus = result.status === 'pending';
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [searchTerm, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedCandidate(expandedCandidate === id ? null : id);
  };

  const handleMoveToShortlist = (id: string, name: string) => {
    alert(`Moved ${name} (${id}) to Shortlist.`);
    // In a real application, you would dispatch an action or make an API call here
  };

  const handleReject = (id: string, name: string) => {
    alert(`Rejected ${name} (${id}).`);
    // In a real application, you would dispatch an action or make an API call here
  };

  const handleAddNote = (id: string) => {
    alert(`Opening add note dialog for candidate ${id}`);
    // In a real application, this would open a modal or navigate to a note-taking interface
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Screening Results</h1>
          <p className="text-gray-500">Review auto-scored candidate screening results and knockout stages independently of application forms.</p>
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
            <option value="pending">Pending Review</option>
            <option value="passed">Passed Screening</option>
            <option value="failed">Failed / Knocked Out</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate / Job</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">Score Rank <ListOrdered className="size-3" /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Knockout Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Screening Review</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-4 py-4 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCandidates.map((result) => (
                <optgroup key={`group-${result.id}`} className="contents">
                  <tr className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{result.candidateName}</span>
                        <span className="text-xs text-gray-500">{result.jobTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <span className="text-base font-bold text-gray-800 w-8">{result.overallScore}</span>
                         <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${result.overallScore >= 80 ? 'bg-green-500' : result.overallScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${result.overallScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {result.knockoutQuestions.every((q: KnockoutQuestion) => q.passed) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle className="size-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="size-3" /> Failed Rule
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        className={`h-8 ${result.knockoutQuestions.every((q: KnockoutQuestion) => q.passed) ? 'bg-autumn-primary hover:bg-autumn-dark text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} px-3`}
                        disabled={!result.knockoutQuestions.every((q: KnockoutQuestion) => q.passed)}
                        onClick={() => handleMoveToShortlist(result.id, result.candidateName)}
                      >
                        Move to Shortlist
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-gray-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 px-3"
                        onClick={() => handleReject(result.id, result.candidateName)}
                      >
                        Reject
                      </Button>
                    </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => toggleExpand(result.id)}
                        className={`p-1.5 rounded-lg transition-transform text-gray-400 hover:text-autumn-primary hover:bg-orange-50 ${expandedCandidate === result.id ? 'rotate-180' : ''}`}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedCandidate === result.id && (
                    <tr className="bg-orange-50/20 border-b-2 border-orange-100">
                      <td colSpan={6} className="px-6 py-4">
                         <div className="grid grid-cols-2 gap-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <AlertCircle className="size-4 text-blue-500" />
                                Knockout Question Analysis
                              </h4>
                              <div className="space-y-3">
                                {result.knockoutQuestions.map((kq: KnockoutQuestion, idx: number) => (
                                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-sm font-medium text-gray-800 mb-1">{kq.question}</p>
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm text-gray-600">Answer: <span className="italic">{kq.answer}</span></p>
                                      {kq.passed ? <CheckCircle className="size-4 text-green-500" /> : <XCircle className="size-4 text-red-500" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                               <h4 className="font-semibold text-gray-900 mb-3">Recruiter Notes</h4>
                               <div className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100 min-h-[100px]">
                                 <p className="text-sm text-gray-700 italic">{result.notes}</p>
                               </div>
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="mt-3 w-full bg-white border-orange-200 text-autumn-primary hover:bg-orange-50"
                                 onClick={() => handleAddNote(result.id)}
                               >
                                 Add Note
                               </Button>
                            </div>
                         </div>
                      </td>
                    </tr>
                  )}
                </optgroup>
              ))}
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <ListOrdered className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No screening results found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

