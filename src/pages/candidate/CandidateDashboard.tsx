import { useState, useRef, useEffect } from 'react';
import { FileText, User, Clock, Search, ChevronLeft, ChevronRight, Bell, Calendar, MapPin, Building, Briefcase, DollarSign, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { StatusTimeline } from '../../components/ats/StatusTimeline';
import { CandidateHeader } from '../../components/ats/CandidateHeader';
import { ApplicationForm } from './ApplicationForm';
import { mockDataService, Job } from '../../services/MockDataService';

interface Application {
  id: string;
  jobTitle: string;
  department: string;
  appliedDate: string;
  status: string;
  currentStage: string;
}

const mockApplications: Application[] = [
  // ... existing mock data
  {
    id: '1',
    jobTitle: 'Senior Frontend Developer',
    department: 'Engineering',
    appliedDate: 'Feb 9, 2026',
    status: 'Interview',
    currentStage: 'interview',
  },
  {
    id: '2',
    jobTitle: 'Product Manager',
    department: 'Product',
    appliedDate: 'Feb 5, 2026',
    status: 'Shortlisted',
    currentStage: 'shortlisted',
  },
  {
    id: '3',
    jobTitle: 'UX Designer',
    department: 'Design',
    appliedDate: 'Jan 28, 2026',
    status: 'Screening',
    currentStage: 'screening',
  },
];

interface CandidateDashboardProps {
  onLogout: () => void;
  onHomeClick: () => void;
  onJobListingsClick: () => void;
  onAboutClick: () => void;
  onLoginClick: () => void;
  onContactClick: () => void;
  onTermsClick?: () => void;
  userProfile?: { name: string; role: string };
}

export function CandidateDashboard({
  onLogout,
  onHomeClick,
  onJobListingsClick,
  onAboutClick,
  onLoginClick,
  onContactClick,
  onTermsClick,
  userProfile
}: CandidateDashboardProps) {
  const [activeTab, setActiveTab] = useState<'applications' | 'profile'>('applications');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Job Flow State
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);

  useEffect(() => {
    setFeaturedJobs(mockDataService.getFeaturedJobs());
  }, []);

  const [profile, setProfile] = useState({
    firstName: 'Lynn',
    lastName: 'Mwangi',
    email: 'lyn.mwangi@example.com',
    phone: '+1 (555) 123-4567',
    gender: 'Female',
    nationality: 'Kenyan',
    location: 'Nairobi, Kenya',
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const timelineSteps = (currentStage: string) => {
    // ... existing logic
    const stages = ['applied', 'screening', 'shortlisted', 'interview', 'offer'];
    const currentIndex = stages.indexOf(currentStage);

    return [
      { label: 'Applied', status: 'completed' as const, date: 'Feb 9' },
      { label: 'Screening', status: (currentIndex >= 1 ? ('completed' as const) : currentIndex === 0 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Shortlisted', status: (currentIndex >= 2 ? ('completed' as const) : currentIndex === 1 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Interview', status: (currentIndex >= 3 ? ('completed' as const) : currentIndex === 2 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Offer', status: (currentIndex >= 4 ? ('completed' as const) : currentIndex === 3 ? ('current' as const) : ('upcoming' as const)) },
    ];
  };

  const isLoggedIn = !!userProfile;

  // Handle Application Form Display
  if (showApplicationForm && applyingJob) {
    return (
      <ApplicationForm
        jobTitle={applyingJob.title}
        onBack={() => {
          setShowApplicationForm(false);
          setApplyingJob(null);
        }}
        onSubmit={() => {
          setShowApplicationForm(false);
          setApplyingJob(null);
          alert("Application Submitted!"); // Could be replaced with a nicer toast
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden relative">
      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <X className="size-5 text-gray-500" />
            </button>

            <div className="p-8">
              <div className="flex gap-4 mb-6">
                <div className="size-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 shrink-0">
                  {selectedJob.company.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.title}</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building className="size-4" />
                    <span>{selectedJob.company}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-8">
                <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <MapPin className="size-4 text-[var(--pumpkin-orange)]" />
                  {selectedJob.location}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <Briefcase className="size-4 text-[var(--pumpkin-orange)]" />
                  {selectedJob.type}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <DollarSign className="size-4 text-[var(--pumpkin-orange)]" />
                  {selectedJob.salary}
                </span>
              </div>

              <div className="space-y-6 text-gray-600">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                  <p className="leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Requirements</h3>
                  <ul className="space-y-2">
                    {selectedJob.requirements.map((req, i) => (
                      <li key={i} className="flex gap-2">
                        <div className="min-w-[6px] h-[6px] rounded-full bg-[var(--pumpkin-orange)] mt-2" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
                <Button
                  className="bg-[var(--pumpkin-orange)] hover:bg-[var(--golden-yellow)] text-white"
                  onClick={() => {
                    setApplyingJob(selectedJob);
                    setShowApplicationForm(true);
                    setSelectedJob(null);
                  }}
                >
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <CandidateHeader
        onLoginClick={onLoginClick} // Should not be clicked when logged in
        onAboutClick={onAboutClick}
        onHomeClick={onHomeClick}
        onJobListingsClick={onJobListingsClick}
        activePage="dashboard"
        isLoggedIn={isLoggedIn}
        userProfile={{ name: userProfile?.name || '' }}
        onLogout={onLogout}
      />

      {/* Hero Section - Visible to ALL */}
      <div
        className="relative min-h-[75vh] w-full flex flex-col justify-center items-center p-0 m-0 border-0 box-border bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/bg1.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-8 text-[#EAE3D2] tracking-wide">FIND A JOB</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-4xl mx-auto w-full">
            <div className="flex-1 w-full relative group">
              <div className="absolute left-0 top-0 bottom-0 px-4 flex items-center justify-center border border-white border-r-0 rounded-l-lg bg-transparent text-white">
                <Search className="size-5" />
              </div>
              <input
                type="text"
                placeholder="Keywords"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-4 py-3 h-12 bg-[#EAE3D2]/60 text-[#222222] placeholder:text-white placeholder:opacity-100 border border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-medium"
              />
            </div>
            <div className="w-full md:w-auto">
              <Button
                className="w-full md:w-auto px-10 h-12 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: 'var(--pumpkin-orange)' }}
                onClick={onJobListingsClick} // Search goes to Job Board
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Jobs Section - Visible to ALL */}
      <div className="w-full py-16 bg-[#b3c2a3] relative">
        <div className="container mx-auto px-6 relative">
          <div className="flex justify-end mb-6">
            <Button
              variant="ghost"
              className="bg-white text-gray-800 hover:bg-gray-100 gap-2 font-medium"
            >
              <Bell className="size-4" /> Subscribe for Job Alerts
            </Button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h4 className="text-2xl font-bold text-gray-900">Featured Jobs</h4>
          </div>

          <div className="relative group/scroll">
            <button
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-md text-gray-600 hover:text-autumn-orange transition-all opacity-0 group-hover/scroll:opacity-100"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="size-5" />
            </button>

            <div
              ref={scrollRef}
              className="flex overflow-x-auto gap-6 pb-4 clean-scrollbar scroll-smooth px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {featuredJobs.map((job) => (
                <div key={job.id} className="min-w-[300px] max-w-[340px] flex-shrink-0 bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow relative flex flex-col h-full">
                  <img src={job.logo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 rounded-md" />
                  <h5 className="font-bold text-lg mb-2 text-gray-900 truncate" title={job.title}>{job.title}</h5>
                  <div className="text-gray-500 text-sm space-y-2 mb-4 flex-1">
                    <p className="truncate">{job.company}</p>
                    <p className="flex items-center justify-center gap-1">
                      <MapPin className="size-3" /> {job.location}
                    </p>
                    <p className="font-semibold text-gray-700">{job.salary}</p>
                    <p className="text-xs flex items-center justify-center gap-1">
                      <Clock className="size-3" /> Posted: {job.posted}
                    </p>
                    {job.deadline && (
                      <p className="text-xs flex items-center justify-center gap-1">
                        <Calendar className="size-3" /> Deadline: {job.deadline}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      className="flex-1 border-autumn-orange text-autumn-orange hover:bg-autumn-orange hover:text-white"
                      onClick={() => setSelectedJob(job)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-autumn-orange text-autumn-orange hover:bg-autumn-orange hover:text-white"
                      onClick={() => {
                        setApplyingJob(job);
                        setShowApplicationForm(true);
                      }}
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-md text-gray-600 hover:text-autumn-orange transition-all opacity-0 group-hover/scroll:opacity-100"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Dashboard Content - Visible ONLY when Logged In */}
      {isLoggedIn && (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-autumn-charcoal mb-2">Welcome back, {profile.firstName}!</h1>
            <p className="text-gray-600">Here is what is happening with your job applications.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Total Applications</h3>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">12</p>
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <span className="font-medium">+2</span> this week
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Interviews</h3>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <User className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">3</p>
              <p className="text-sm text-gray-500 mt-2">Upcoming interviews</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Profile Views</h3>
                <div className="p-2 bg-orange-50 text-autumn-orange rounded-lg">
                  <Search className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">45</p>
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <span className="font-medium">+15%</span> vs last month
              </p>
            </div>
          </div>


          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="border-b border-border">
              <div className="flex items-center gap-8 px-8">
                <button
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'applications'
                    ? 'border-autumn-orange text-autumn-orange'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  onClick={() => setActiveTab('applications')}
                >
                  My Applications
                </button>
                <button
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile'
                    ? 'border-autumn-orange text-autumn-orange'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  onClick={() => setActiveTab('profile')}
                >
                  My Profile
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeTab === 'applications' ? (
                <div className="space-y-6">
                  {mockApplications.map((app) => (
                    <div key={app.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-autumn-charcoal mb-1">{app.jobTitle}</h3>
                          <p className="text-gray-500 text-sm mb-3">{app.department} â€¢ Applied on {app.appliedDate}</p>
                          <StatusBadge status={app.status} />
                        </div>
                        <Button variant="outline" size="sm" className="text-autumn-orange border-autumn-orange hover:bg-autumn-orange hover:text-white">
                          View Details
                        </Button>
                      </div>

                      <StatusTimeline
                        steps={timelineSteps(app.currentStage)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Profile Content (Simplified for now) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-bold text-autumn-charcoal mb-4">Personal Information</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">First Name</label>
                            <input
                              type="text"
                              value={profile.firstName}
                              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Last Name</label>
                            <input
                              type="text"
                              value={profile.lastName}
                              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">Email</label>
                          <input
                            type="email"
                            value={profile.email}
                            className="w-full p-2 border border-border rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-border">
                    <Button className="bg-autumn-orange hover:bg-autumn-pumpkin text-white px-8">
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white text-center py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-center gap-6 mb-4">
            <a href="#" className="text-white hover:text-autumn-orange transition-colors">Facebook</a>
            <a href="#" className="text-white hover:text-autumn-orange transition-colors">Instagram</a>
            <a href="#" className="text-white hover:text-autumn-orange transition-colors">LinkedIn</a>
          </div>
          <div className="text-sm text-gray-400">
            <button
              onClick={onTermsClick}
              className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-white mr-4 transition-colors"
            >
              Terms and Conditions
            </button>
            <button
              onClick={onContactClick}
              className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

