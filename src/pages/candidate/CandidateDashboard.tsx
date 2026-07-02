import { useState, useEffect } from 'react';
import { FileText, User, Search, Briefcase } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { StatusTimeline } from '../../components/ats/StatusTimeline';
import { CandidateHeader } from '../../components/ats/CandidateHeader';
import { NotificationBell } from '../../components/ats/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { Application, getApplicationsByCandidate } from '../../services/applicationService';
import { Offer, getOffersForCandidate, respondToOffer } from '../../services/offerService';
import {
  CandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
  uploadProfileCv,
} from '../../services/profileService';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'profile'>('applications');
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);

  const loadApplications = () => {
    if (user) {
      getApplicationsByCandidate(user.id).then(setMyApplications).catch(() => {});
      getOffersForCandidate(user.id).then(setMyOffers).catch(() => {});
    }
  };

  useEffect(loadApplications, [user]);

  const handleOfferResponse = async (offer: Offer, decision: 'accepted' | 'rejected') => {
    if (!user) return;
    const verb = decision === 'accepted' ? 'accept' : 'decline';
    if (!confirm(`Are you sure you want to ${verb} the offer for ${offer.jobTitle}?`)) return;
    try {
      await respondToOffer(offer, decision, user);
      loadApplications();
      alert(decision === 'accepted'
        ? 'Congratulations! Your acceptance has been recorded — the team will be in touch about next steps.'
        : 'Your response has been recorded. Thank you for letting us know.');
    } catch (err: any) {
      alert(err?.message || 'Failed to record your response.');
    }
  };

  const pendingOffers = myOffers.filter((o) => o.status === 'sent');

  const nameParts = (user?.name || '').split(' ');
  const [profile, setProfile] = useState({
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    gender: '',
    nationality: '',
    city: '',
    country: '',
  });
  const [savedCv, setSavedCv] = useState<{ url?: string; name?: string }>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  // Load the persisted profile from Firestore.
  useEffect(() => {
    if (!user) return;
    getCandidateProfile(user.id)
      .then((p: CandidateProfile) => {
        const parts = (p.name || user.name || '').split(' ');
        setProfile((prev) => ({
          ...prev,
          firstName: parts[0] || prev.firstName,
          lastName: parts.slice(1).join(' ') || prev.lastName,
          email: user.email,
          phone: p.phone || '',
          gender: p.gender || '',
          nationality: p.nationality || '',
          city: p.city || '',
          country: p.country || '',
        }));
        setSavedCv({ url: p.cvUrl, name: p.cvFileName });
      })
      .catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateCandidateProfile(user.id, {
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        phone: profile.phone,
        gender: profile.gender,
        nationality: profile.nationality,
        city: profile.city,
        country: profile.country,
      });
      alert('Profile saved.');
    } catch (err: any) {
      alert(err?.message || 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setUploadingCv(true);
    try {
      const up = await uploadProfileCv(user.id, e.target.files[0]);
      setSavedCv({ url: up.url, name: up.name });
    } catch (err: any) {
      alert(err?.message || 'Failed to upload CV.');
    } finally {
      setUploadingCv(false);
    }
  };

  const timelineSteps = (currentStage: string) => {
    const stages = ['applied', 'longlisted', 'shortlisted', 'interview', 'offer', 'hired'];
    const currentIndex = stages.indexOf(currentStage);

    return [
      { label: 'Applied', status: 'completed' as const },
      { label: 'Longlisted', status: (currentIndex >= 2 ? ('completed' as const) : currentIndex === 1 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Shortlisted', status: (currentIndex >= 3 ? ('completed' as const) : currentIndex === 2 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Interview', status: (currentIndex >= 4 ? ('completed' as const) : currentIndex === 3 ? ('current' as const) : ('upcoming' as const)) },
      { label: 'Offer', status: (currentIndex >= 5 ? ('completed' as const) : currentIndex === 4 ? ('current' as const) : ('upcoming' as const)) },
    ];
  };

  const isLoggedIn = !!userProfile;

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden relative flex flex-col">
      {/* Header */}
      <CandidateHeader
        onLoginClick={onLoginClick}
        onAboutClick={onAboutClick}
        onHomeClick={onHomeClick}
        onJobListingsClick={onJobListingsClick}
        activePage="dashboard"
        isLoggedIn={isLoggedIn}
        userProfile={{ name: userProfile?.name || '' }}
        onLogout={onLogout}
      />

      {/* Dashboard Content */}
      {isLoggedIn && (
        <div className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-autumn-charcoal mb-2">Welcome back, {profile.firstName}!</h1>
              <p className="text-gray-600">Here is what is happening with your job applications.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2 text-autumn-orange border-autumn-orange hover:bg-autumn-orange hover:text-white"
                onClick={onJobListingsClick}
              >
                <Briefcase className="size-4" />
                Open Vacancies
              </Button>
              <NotificationBell />
            </div>
          </div>

          {/* Pending offers — candidate accept/decline */}
          {pendingOffers.length > 0 && (
            <div className="mb-8 space-y-4">
              {pendingOffers.map((offer) => (
                <div key={offer.id} className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-1">
                    You have an offer for {offer.jobTitle}!
                  </h3>
                  <p className="text-sm text-green-800 mb-4">
                    {offer.salary ? `Compensation: ${offer.currency ?? ''} ${offer.salary}. ` : ''}
                    {offer.startDate ? `Proposed start date: ${offer.startDate}. ` : ''}
                    {offer.notes ? offer.notes : ''}
                  </p>
                  <div className="flex gap-3">
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleOfferResponse(offer, 'accepted')}>
                      Accept Offer
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleOfferResponse(offer, 'rejected')}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Total Applications</h3>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">{myApplications.length}</p>
              <p className="text-sm text-gray-500 mt-2">All time</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Interviews</h3>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <User className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">{myApplications.filter((a) => a.status === 'interview').length}</p>
              <p className="text-sm text-gray-500 mt-2">In interview stage</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-500">Offers</h3>
                <div className="p-2 bg-orange-50 text-autumn-orange rounded-lg">
                  <Search className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-autumn-charcoal">{myApplications.filter((a) => a.status === 'offer' || a.status === 'hired').length}</p>
              <p className="text-sm text-gray-500 mt-2">Offers & hires</p>
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
                  {myApplications.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="size-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium text-gray-900 mb-1">No applications yet</p>
                      <p className="text-sm mb-4">Browse the open vacancies and apply to get started.</p>
                      <Button
                        variant="outline"
                        className="text-autumn-orange border-autumn-orange hover:bg-autumn-orange hover:text-white"
                        onClick={onJobListingsClick}
                      >
                        View Open Vacancies
                      </Button>
                    </div>
                  )}
                  {myApplications.map((app) => (
                    <div key={app.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-autumn-charcoal mb-1">{app.jobTitle}</h3>
                          <p className="text-gray-500 text-sm mb-3">
                            {app.department} • Applied on{' '}
                            {app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : '—'}
                          </p>
                          <StatusBadge status={app.status} />
                        </div>
                      </div>

                      {['regretted', 'rejected', 'withdrawn'].includes(app.status) ? (
                        <p className="text-sm text-gray-500">
                          This application is no longer in progress. Thank you for your interest — we encourage you to apply for future roles.
                        </p>
                      ) : (
                        <StatusTimeline steps={timelineSteps(app.status)} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Phone</label>
                            <input
                              type="tel"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Gender</label>
                            <select
                              value={profile.gender}
                              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg bg-white"
                            >
                              <option value="">Select…</option>
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="other">Other</option>
                              <option value="prefer-not-to-say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Nationality</label>
                            <input
                              type="text"
                              value={profile.nationality}
                              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">City</label>
                            <input
                              type="text"
                              value={profile.city}
                              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Country</label>
                            <input
                              type="text"
                              value={profile.country}
                              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                              className="w-full p-2 border border-border rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-autumn-charcoal mb-4">My CV</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload a CV once and reuse it when applying for jobs.
                      </p>
                      {savedCv.url ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-green-800">
                            <FileText className="size-4" />
                            <span className="font-medium">{savedCv.name}</span>
                          </div>
                          <a href={savedCv.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                            View
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic mb-4">No CV saved yet.</p>
                      )}
                      <div className="relative inline-block">
                        <Button variant="outline" className="pointer-events-none" disabled={uploadingCv}>
                          {uploadingCv ? 'Uploading…' : savedCv.url ? 'Replace CV' : 'Upload CV'}
                        </Button>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleCvUpload}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-border">
                    <Button
                      className="bg-autumn-orange hover:bg-autumn-pumpkin text-white px-8"
                      disabled={savingProfile}
                      onClick={handleSaveProfile}
                    >
                      {savingProfile ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minimal footer */}
      <footer className="bg-[#1a1a1a] text-white text-center py-6 mt-auto">
        <div className="container mx-auto px-6 text-sm text-gray-400">
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
      </footer>
    </div>
  );
}
