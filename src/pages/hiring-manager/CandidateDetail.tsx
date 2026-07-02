import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Linkedin, FileText, Download, Star, Save, UserCheck, Calendar, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { mockDataService, Application } from '../../services/MockDataService';

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
}

export function CandidateDetail({ candidateId, onBack }: CandidateDetailProps) {
  const [application, setApplication] = useState<Application | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [newScore, setNewScore] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const app = mockDataService.getApplicationById(candidateId);
    setApplication(app);
    if (app) setNewScore(app.score);
    setLoading(false);
  }, [candidateId]);

  const handleUpdateScore = () => {
    if (application) {
      mockDataService.updateApplicationScore(application.id, newScore);
      // Ideally refresh or update local state
      setApplication({ ...application, score: newScore });
    }
  };

  const handleUpdateStatus = (status: Application['status']) => {
    if (application) {
      mockDataService.updateApplicationStatus(application.id, status);
      setApplication({ ...application, status });
    }
  };

  if (loading) return <div className="p-8">Loading candidate details...</div>;
  if (!application) return <div className="p-8">Candidate not found. <button onClick={onBack} className="text-blue-600 underline">Back</button></div>;

  const documents = [];
  if (application.resume) {
    documents.push({ name: application.resume, type: 'Resume', date: application.appliedDate });
  }
  if (application.coverLetter) {
    documents.push({ name: application.coverLetter, type: 'Cover Letter', date: application.appliedDate });
  }

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
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
                Applied for <span className="font-medium">{application.jobTitle}</span> â€¢ {application.department}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" />
                  {application.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {application.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {application.location}
                </span>
                {application.linkedin && (
                  <a
                    href={`https://${application.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700"
                  >
                    <Linkedin className="size-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <div className="flex items-center gap-2">
                <Star className="size-5 text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-semibold">{application.score}</span>
                <span className="text-gray-500">/100</span>
              </div>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </div>
        
        {/* Pipeline Actions */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
          <Button 
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-none border-0" 
            onClick={() => handleUpdateStatus('Longlist')}
          >
            <UserCheck className="size-4 mr-2" /> Move to Longlist
          </Button>
          <Button 
            className="bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-none border-0" 
            onClick={() => handleUpdateStatus('Shortlist')}
          >
            <Star className="size-4 mr-2" /> Shortlist
          </Button>
          <Button 
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 shadow-none border-0" 
            onClick={() => handleUpdateStatus('Interview')}
          >
            <Calendar className="size-4 mr-2" /> Schedule Interview
          </Button>
          <Button 
            className="bg-green-50 text-green-700 hover:bg-green-100 shadow-none border-0" 
            onClick={() => handleUpdateStatus('Offer')}
          >
            <CheckCircle2 className="size-4 mr-2" /> Make Offer
          </Button>
          <div className="flex-1"></div>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" 
            onClick={() => handleUpdateStatus('Rejected')}
          >
            <XCircle className="size-4 mr-2" /> Reject
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Overview & Resume */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Candidate Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Experience</h3>
                <p className="font-medium text-gray-900">{application.experience}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Expected Salary</h3>
                <p className="font-medium text-gray-900">{application.expectedSalary}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1">Availability</h3>
                <p className="font-medium text-gray-900">{application.availability}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <span className="font-semibold text-gray-700 text-sm">Portfolio:</span>
              <a href={`https://${application.portfolio}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{application.portfolio}</a>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <FileText className="size-5 text-gray-400" />
                 Resume Preview
               </h2>
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="gap-2">
                    <Download className="size-4" /> Download PDF
                 </Button>
               </div>
            </div>
            {/* Mock PDF Viewer */}
            <div className="flex-1 bg-gray-100 p-6 overflow-y-auto flex justify-center">
               <div className="bg-white w-full max-w-2xl shadow-sm border border-gray-300 min-h-full p-12 select-none">
                  {/* Mock Resume Content */}
                  <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                     <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{application.candidateName}</h1>
                     <p className="text-gray-600 text-sm">{application.email} | {application.phone} | {application.location}</p>
                  </div>
                  
                  <div className="mb-6">
                     <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">Professional Summary</h2>
                     <div className="h-16 bg-gray-100 rounded w-full mb-2"></div>
                     <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  </div>
                  
                  <div className="mb-6">
                     <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">Experience</h2>
                     <div className="mb-4">
                       <div className="flex justify-between font-bold text-gray-900 mb-1">
                         <span>Senior Developer â€¢ Autumhire</span>
                         <span>2020 - Present</span>
                       </div>
                       <ul className="list-disc pl-5 space-y-2 mt-2">
                         <li className="h-2 bg-gray-200 rounded w-full"></li>
                         <li className="h-2 bg-gray-200 rounded w-5/6"></li>
                         <li className="h-2 bg-gray-200 rounded w-4/5"></li>
                       </ul>
                     </div>
                     <div className="mb-4">
                       <div className="flex justify-between font-bold text-gray-900 mb-1">
                         <span>Software Engineer â€¢ TechCorp</span>
                         <span>2017 - 2020</span>
                       </div>
                       <ul className="list-disc pl-5 space-y-2 mt-2">
                         <li className="h-2 bg-gray-200 rounded w-11/12"></li>
                         <li className="h-2 bg-gray-200 rounded w-full"></li>
                       </ul>
                     </div>
                  </div>
                  
                  <div>
                     <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">Education</h2>
                     <div className="flex justify-between font-bold text-gray-900">
                       <span>BS Computer Science â€¢ University of Technology</span>
                       <span>2013 - 2017</span>
                     </div>
                  </div>
               </div>
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
                   min="0" max="100"
                 />
                 <Button onClick={handleUpdateScore} size="sm" variant="outline" className="h-8 px-2">
                   <Save className="size-4" />
                 </Button>
               </div>
             </div>
             
             <div className="space-y-4">
               {application.screeningAnswers.map((item, index) => (
                 <div key={index} className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                   <div className="flex justify-between items-start mb-1">
                     <h4 className="font-semibold text-gray-800 text-sm leading-tight">{item.question}</h4>
                     {item.score !== undefined && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.score}/10</span>}
                   </div>
                   <p className="text-gray-600 text-sm mt-2">{item.answer}</p>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
               <MessageSquare className="size-5 text-gray-400" />
               Recruiter Notes
             </h2>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none mb-3 bg-yellow-50/30"
               placeholder="Add your private notes about this candidate here..."
             />
             <Button className="w-full">Save Note</Button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
               <Calendar className="size-5 text-gray-400" />
               Interview History
             </h2>
             <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500 mb-2">No interviews scheduled yet.</p>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Interview')}>Schedule Now</Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

