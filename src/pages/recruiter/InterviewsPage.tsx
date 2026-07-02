import { useState } from 'react';
import { Search, Filter, CalendarPlus, UserCheck, Video, MapPin, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface Interview {
  id: string;
  candidateName: string;
  jobTitle: string;
  date: string;
  time: string;
  duration: string;
  type: 'video' | 'in-person' | 'phone';
  location: string;
  panel: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  feedbackSubmitted: number;
}

const mockInterviews: Interview[] = [
  {
    id: 'INT-001',
    candidateName: 'Michael Chen',
    jobTitle: 'Senior Frontend Developer',
    date: '2024-03-20',
    time: '10:00 AM',
    duration: '45 mins',
    type: 'video',
    location: 'Google Meet',
    panel: ['John Smith', 'Sarah Lee'],
    status: 'scheduled',
    feedbackSubmitted: 0
  },
  {
    id: 'INT-002',
    candidateName: 'Emma Williams',
    jobTitle: 'UX Designer',
    date: '2024-03-18',
    time: '2:00 PM',
    duration: '60 mins',
    type: 'in-person',
    location: 'London Office - Room A',
    panel: ['Mike Chen'],
    status: 'completed',
    feedbackSubmitted: 1
  },
  {
    id: 'INT-003',
    candidateName: 'David Miller',
    jobTitle: 'Product Manager',
    date: '2024-03-22',
    time: '11:00 AM',
    duration: '30 mins',
    type: 'video',
    location: 'Zoom Setup',
    panel: ['Sarah Jenkins', 'John Smith', 'Alex Rivers'],
    status: 'scheduled',
    feedbackSubmitted: 0
  }
];

interface InterviewsPageProps {
  onScheduleInterview?: () => void;
}

export function InterviewsPage({ 
  onScheduleInterview = () => alert('Opening Interview Scheduler modal...') 
}: InterviewsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInterviews = mockInterviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleManageInterview = (id: string, candidate: string) => {
    alert(`Managing interview for ${candidate} (${id})`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Interviews</h1>
          <p className="text-gray-500">Schedule, coordinate, and track all candidate interviews and panel feedback.</p>
        </div>
        <Button 
          className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl"
          onClick={onScheduleInterview}
        >
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Panel Members</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Feedback</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredInterviews.map((interview) => (
                <tr key={interview.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{interview.candidateName}</span>
                      <span className="text-xs text-gray-500">{interview.jobTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-800">{new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'})}</span>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="size-3" />
                        {interview.time} ({interview.duration})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {interview.type === 'video' ? (
                        <span className="inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          <Video className="size-3" /> Video Call
                        </span>
                      ) : (
                        <span className="inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                          <MapPin className="size-3" /> In-Person
                        </span>
                      )}
                      <span className="text-xs text-gray-500 truncate max-w-[150px]">{interview.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <div className="flex -space-x-2">
                           {interview.panel.slice(0, 2).map((member, i) => (
                             <div key={i} className="size-6 rounded-full bg-orange-100 border border-white text-orange-800 flex items-center justify-center text-[10px] font-bold" title={member}>
                               {member.charAt(0)}
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
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 w-fit rounded-md text-xs font-medium border ${interview.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {interview.status === 'scheduled' ? <CalendarPlus className="size-3" /> : <UserCheck className="size-3" />}
                        {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                      </span>
                      {interview.status === 'completed' && (
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          Feedback: <span className={interview.feedbackSubmitted === interview.panel.length ? 'text-green-600' : 'text-amber-600'}>{interview.feedbackSubmitted}/{interview.panel.length}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="h-8 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 px-3"
                       onClick={() => handleManageInterview(interview.id, interview.candidateName)}
                     >
                       Manage
                     </Button>
                  </td>
                </tr>
              ))}
              {filteredInterviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CalendarPlus className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No interviews found</p>
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

