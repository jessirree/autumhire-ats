import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Briefcase, Clock, ChevronRight, Bell, Filter, Building, DollarSign, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { CandidateHeader } from '../../components/ats/CandidateHeader';
import { ApplicationForm } from './ApplicationForm';
import { mockDataService, Job } from '../../services/MockDataService';

interface JobBoardProps {
  onJobClick: (jobId: string) => void;
  onLoginClick: () => void;
  onHomeClick: () => void;
  onAboutClick: () => void;
  onJobListingsClick: () => void;
  isLoggedIn?: boolean;
  userProfile?: { name: string; avatar?: string };
  onLogout?: () => void;
}

export function JobBoard({
  onLoginClick,
  onHomeClick,
  onAboutClick,
  onJobListingsClick,
  isLoggedIn,
  userProfile,
  onLogout
}: JobBoardProps) {
  // State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const localJobs = JSON.parse(localStorage.getItem('mockJobs') || '[]');
    setJobs([...localJobs, ...mockDataService.getJobs()]);
  }, []);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  // Filtering Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch =
        searchTerm === '' ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLocation = locationFilter === '' || job.location.includes(locationFilter) || (locationFilter === 'Remote' && job.location === 'Remote');
      const matchType = typeFilter === '' || job.type === typeFilter;
      const matchExperience = experienceFilter === '' || job.experienceLevel === experienceFilter;
      const matchOrg = orgFilter === '' || job.company.includes(orgFilter);

      return matchSearch && matchLocation && matchType && matchExperience && matchOrg;
    });
  }, [jobs, searchTerm, locationFilter, typeFilter, experienceFilter, orgFilter]);

  // If the active job is filtered out, clear selection (but NOT initially)
  useEffect(() => {
    if (activeJobId && !filteredJobs.find((job) => job.id === activeJobId)) {
      setActiveJobId(null);
    }
  }, [filteredJobs, activeJobId]);

  const activeJob = jobs.find((job) => job.id === activeJobId);

  if (showApplicationForm && activeJob) {
    return (
      <ApplicationForm
        jobTitle={activeJob.title}
        onBack={() => setShowApplicationForm(false)}
        onSubmit={() => {
          setShowApplicationForm(false);
          setActiveJobId(null);
          // Ideally show a success message here
        }}
      />
    );
  }

  // Handlers
  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setTypeFilter('');
    setExperienceFilter('');
    setOrgFilter('');
  };

  const handleJobClick = (id: string) => {
    setActiveJobId(id);
    // Scroll to top of detail view on mobile if needed, or ensuring visibility
  };

  const activeFiltersCount = [locationFilter, typeFilter, experienceFilter, orgFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F9F9F9] font-sans flex flex-col">
      <CandidateHeader
        onLoginClick={onLoginClick}
        onHomeClick={onHomeClick}
        onAboutClick={onAboutClick}
        onJobListingsClick={onJobListingsClick}
        activePage="job-board"
        isLoggedIn={isLoggedIn}
        userProfile={userProfile}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <input
                type="text"
                placeholder="Search jobs, keywords, companies..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="md:w-32 h-[50px] bg-[var(--pumpkin-orange)] hover:bg-[var(--golden-yellow)] text-white font-semibold shadow-md">
              Search
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500 mr-2">
              <Filter className="size-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <select
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--pumpkin-orange)] cursor-pointer hover:border-gray-300"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="Nairobi">Nairobi, Kenya</option>
              <option value="New York">New York, USA</option>
              <option value="Accra">Accra, Ghana</option>
              <option value="Capetown">Capetown, South Africa</option>
            </select>

            <select
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--pumpkin-orange)] cursor-pointer hover:border-gray-300"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Job Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>

            <select
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--pumpkin-orange)] cursor-pointer hover:border-gray-300"
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
            >
              <option value="">Experience Level</option>
              <option value="Entry Level">Entry Level</option>
              <option value="Mid-Level">Mid-Level</option>
              <option value="Senior">Senior</option>
              <option value="Executive">Executive</option>
            </select>

            <select
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--pumpkin-orange)] cursor-pointer hover:border-gray-300"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="">All Companies</option>
              <option value="Autumhire">Autumhire Tech</option>
              <option value="Innovate">Innovate Corp</option>
              <option value="Creative">Creative Studios</option>
            </select>

            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--pumpkin-orange)] hover:text-[var(--golden-yellow)] underline ml-auto font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'} Found
          </h2>
          <Button variant="outline" className="text-[var(--forest-green)] border-[var(--forest-green)] hover:bg-[var(--forest-green)] hover:text-white gap-2">
            <Bell className="size-4" />
            <span className="hidden sm:inline">Subscribe for Alerts</span>
          </Button>
        </div>

        {/* Dynamic Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-320px)] min-h-[600px]">

          {/* Job List Component */}
          <div className={`
            flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-300
            ${activeJobId ? 'col-span-12 lg:col-span-5' : 'col-span-12'}
          `}>

            {/* Inner Grid for proper card layout in full width mode */}
            <div className={`
              ${!activeJobId ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-3'}
            `}>
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleJobClick(job.id)}
                    className={`
                      rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md
                      ${activeJobId === job.id
                        ? 'bg-orange-50 border-[var(--pumpkin-orange)] ring-1 ring-[var(--pumpkin-orange)] p-4'
                        : 'bg-white border-gray-200 hover:border-gray-300 p-5'}
                    `}
                  >
                    <div className="flex gap-4">
                      <div className="size-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building className="size-6 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-base mb-1 truncate ${activeJobId === job.id ? 'text-[var(--pumpkin-orange)]' : 'text-gray-900'}`}>{job.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">{job.company}</p>

                        <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {job.posted}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="size-3" />
                            {job.salary}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <StatusBadge status={job.type} size="sm" />
                          {activeJobId === job.id && (
                            <ChevronRight className="size-4 text-[var(--pumpkin-orange)]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white rounded-xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center h-64">
                  <Search className="size-10 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
                </div>
              )}
            </div>
          </div>

          {/* Detail View - Right Panel (Conditionally Rendered) */}
          {activeJobId && activeJob && (
            <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col fixed inset-0 z-50 lg:static lg:z-auto">
              <div className="h-full flex flex-col overflow-y-auto custom-scrollbar relative">

                {/* Close Button for Mobile/Desktop */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveJobId(null);
                  }}
                  className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700 transition-colors z-10"
                  aria-label="Close details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Job Header */}
                <div className="p-8 border-b border-gray-100 pt-10 lg:pt-8">
                  <div className="flex justify-between items-start mb-6 pr-8">
                    <div className="flex gap-4">
                      <div className="size-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400">
                        {activeJob.company.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{activeJob.title}</h1>
                        <div className="text-gray-600 font-medium flex items-center gap-2">
                          <Building className="size-4" />
                          {activeJob.company}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeJob.deadline && (
                    <div className="mb-6">
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        Deadline: {activeJob.deadline}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 mb-8">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <MapPin className="size-4 text-[var(--pumpkin-orange)]" />
                      {activeJob.location}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Briefcase className="size-4 text-[var(--pumpkin-orange)]" />
                      {activeJob.type}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <DollarSign className="size-4 text-[var(--pumpkin-orange)]" />
                      {activeJob.salary}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Clock className="size-4 text-[var(--pumpkin-orange)]" />
                      {activeJob.experienceLevel}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setShowApplicationForm(true)} className="flex-1 bg-[var(--pumpkin-orange)] hover:bg-[var(--golden-yellow)] text-white font-bold h-12 shadow-lg hover:shadow-xl transition-all">
                      Apply Now
                    </Button>
                    <Button variant="outline" className="w-12 h-12 p-0 flex items-center justify-center border-gray-300 text-gray-500 hover:text-[var(--pumpkin-orange)] hover:border-[var(--pumpkin-orange)]">
                      <Briefcase className="size-5" />
                    </Button>
                  </div>
                </div>

                {/* Job Body */}
                <div className="p-8 space-y-8">
                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {activeJob.description}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Requirements</h3>
                    <ul className="space-y-2">
                      {activeJob.requirements.map((req, i) => (
                        <li key={i} className="flex gap-3 text-gray-600">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[var(--pumpkin-orange)] mt-2" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

