import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import './index.css';

import { toast } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { DialogHost } from './components/ui/confirm-dialog';
import { Job as JobType, getJobById } from './services/jobService';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

// Candidate pages
import { JobBoard } from './pages/candidate/JobBoard';
import { JobDetail } from './pages/candidate/JobDetail';
import { ApplicationForm } from './pages/candidate/ApplicationForm';
import { CandidateDashboard } from './pages/candidate/CandidateDashboard';
import { AboutUs } from './pages/candidate/AboutUs';
import { ContactUs } from './pages/candidate/ContactUs';
import { TermsandConditions } from './pages/candidate/TermsandConditions';

// Recruiter pages
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { ApplicationsPage } from './pages/recruiter/ApplicationsPage';
import { CandidateDetail } from './pages/recruiter/CandidateDetail';
import { JobRequisitionsPage } from './pages/recruiter/JobRequisitionsPage';
import { NewRequisitionPage } from './pages/recruiter/NewRequisitionPage';
import { JobAdvertsPage } from './pages/recruiter/JobAdvertsPage';
import { ScreeningPage } from './pages/recruiter/ScreeningPage';
import { CandidatesPage } from './pages/recruiter/CandidatesPage';
import { InterviewsPage as RecruiterInterviewsPage } from './pages/recruiter/InterviewsPage';
import { OffersPage } from './pages/recruiter/OffersPage';

// Hiring Manager pages
import { HiringManagerDashboard } from './pages/hiring-manager/HiringManagerDashboard';
import { ShortlistingPage } from './pages/hiring-manager/ShortlistingPage';
import { CandidateDetail as HMCandidateDetail } from './pages/hiring-manager/CandidateDetail';
import { OfferApprovalPage } from './pages/hiring-manager/OfferApprovalPage';
import { InterviewsPage } from './pages/hiring-manager/InterviewsPage';
import { RequisitionApprovals } from './pages/hiring-manager/RequisitionApprovals';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CreateJob } from './pages/admin/CreateJob';
import { UserManagement } from './pages/admin/UserManagement';
import { PositionsPage } from './pages/admin/PositionsPage';
import { TemplateManagement } from './pages/admin/TemplateManagement';
import { PrescreeningBuilder } from './pages/admin/PrescreeningBuilder';
import { ReportsPage } from './pages/admin/ReportsPage';
import { WorkflowConfiguration } from './pages/admin/WorkflowConfiguration';

// A wrapper to handle the complex mock properties previously passed to Candidate views
function CandidateViewsWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleJobClick = (jobId: string) => navigate(`/jobs/${jobId}`);
  const handleLoginClick = () => navigate('/login');
  const handleHomeClick = () => {
    if (isAuthenticated && user?.role === 'candidate') navigate('/candidate/dashboard');
    else navigate('/');
  };
  const handleAboutClick = () => navigate('/about');
  const handleJobListingsClick = () => navigate('/jobs');
  const handleContactClick = () => navigate('/contact');
  const handleTermsClick = () => navigate('/terms');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return React.cloneElement(children as React.ReactElement, {
    onJobClick: handleJobClick,
    onLoginClick: handleLoginClick,
    onHomeClick: handleHomeClick,
    onAboutClick: handleAboutClick,
    onJobListingsClick: handleJobListingsClick,
    onContactClick: handleContactClick,
    onTermsClick: handleTermsClick,
    onLogout: handleLogout,
    isLoggedIn: isAuthenticated,
    userProfile: isAuthenticated && user?.role === 'candidate' ? { name: user.name, role: 'Candidate' } : undefined,
  });
}

function JobDetailWrapper() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  return (
    <JobDetail
      jobId={jobId || ''}
      onBack={() => navigate('/jobs')}
      onApply={() => navigate(`/jobs/${jobId}/apply`)}
    />
  );
}

function ApplicationFormWrapper() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [job, setJob] = React.useState<JobType | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    getJobById(jobId)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading…</div>
    );
  }
  if (!job) {
    return <Navigate to="/jobs" replace />;
  }
  return (
    <ApplicationForm
      job={job}
      onBack={() => navigate(-1)}
      onSubmit={() => {
        toast.success('Application submitted successfully! You will receive a confirmation notification.');
        navigate('/jobs');
      }}
    />
  );
}

function RecruiterCandidateDetailWrapper() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <CandidateDetail candidateId={id || ''} onBack={() => navigate('/recruiter/applications')} />;
}

function HMCandidateDetailWrapper() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <HMCandidateDetail candidateId={id || ''} onBack={() => navigate('/hiring/shortlisting')} />;
}

function RecruiterPostJobWrapper() {
  const navigate = useNavigate();
  const requisitionId = new URLSearchParams(window.location.search).get('req') || undefined;
  return (
    <CreateJob
      fromRequisitionId={requisitionId}
      onBack={() => navigate(requisitionId ? '/recruiter/requisitions' : '/recruiter/dashboard')}
      onSubmit={() => navigate(requisitionId ? '/recruiter/requisitions' : '/recruiter/dashboard')}
      onSkip={() => navigate('/recruiter/dashboard')}
    />
  );
}

function EditJobWrapper() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <CreateJob
      editJobId={id}
      onBack={() => navigate('/admin/dashboard')}
      onSubmit={() => navigate('/admin/dashboard')}
      onSkip={() => navigate('/admin/dashboard')}
    />
  );
}

function UnderConstruction({ pageName }: { pageName: string }) {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">{pageName}</h2>
        <p className="text-gray-600">This feature is under construction</p>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-autumn-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const rolePath = user.role === 'hiring-manager' ? 'hiring' : user.role;
  return <Navigate to={`/${rolePath}/dashboard`} replace />;
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Root Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Pages */}
      <Route path="/jobs" element={<CandidateViewsWrapper><JobBoard {...({} as any)} /></CandidateViewsWrapper>} />
      <Route path="/about" element={<CandidateViewsWrapper><AboutUs {...({} as any)} /></CandidateViewsWrapper>} />
      <Route path="/contact" element={<CandidateViewsWrapper><ContactUs {...({} as any)} /></CandidateViewsWrapper>} />
      <Route path="/terms" element={<CandidateViewsWrapper><TermsandConditions {...({} as any)} /></CandidateViewsWrapper>} />

      {/* Jobs Flow (Public) */}
      <Route path="/jobs/:jobId" element={<JobDetailWrapper />} />
      <Route path="/jobs/:jobId/apply" element={<ApplicationFormWrapper />} />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Candidate Protected Route */}
      <Route path="/candidate/*" element={<ProtectedRoute allowedRoles={['candidate']}><Outlet /></ProtectedRoute>}>
        <Route path="dashboard" element={<CandidateViewsWrapper><CandidateDashboard {...({} as any)} /></CandidateViewsWrapper>} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard onNavigate={(path) => navigate(`/admin/${path}`)} initialTab="jobs" />} />
        <Route path="users" element={<div className="p-8"><UserManagement /></div>} />
        <Route path="positions" element={<PositionsPage />} />
        <Route path="requisition-approvals" element={<RequisitionApprovals />} />
        <Route path="templates" element={<TemplateManagement />} />
        <Route path="screening" element={<PrescreeningBuilder />} />
        <Route path="workflow" element={<WorkflowConfiguration />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="post-job" element={<CreateJob onBack={() => navigate('/admin/dashboard')} onSubmit={() => navigate('/admin/dashboard')} onSkip={() => navigate('/admin/dashboard')} />} />
        <Route path="edit-job/:id" element={<EditJobWrapper />} />
        <Route path="*" element={<UnderConstruction pageName="Admin Feature" />} />
      </Route>

      {/* Recruiter */}
      <Route path="/recruiter" element={<ProtectedRoute allowedRoles={['recruiter']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<RecruiterDashboard />} />
        <Route path="requisitions" element={<JobRequisitionsPage onCreateRequisition={() => navigate('/recruiter/requisitions/new')} onPublish={(id) => navigate(`/recruiter/post-job?req=${id}`)} />} />
        <Route path="requisitions/new" element={<NewRequisitionPage onBack={() => navigate('/recruiter/requisitions')} onSuccess={() => navigate('/recruiter/requisitions')} />} />
        <Route path="adverts" element={<JobAdvertsPage onCreateAdvert={() => navigate('/recruiter/post-job')} onViewApplications={() => navigate('/recruiter/applications')} />} />
        <Route path="applications" element={<ApplicationsPage onViewCandidate={(id) => navigate(`/recruiter/candidate-detail/${id}`)} />} />
        <Route path="screening" element={<ScreeningPage />} />
        <Route path="candidates" element={<CandidatesPage onViewCandidate={(id) => navigate(`/recruiter/candidate-detail/${id}`)} />} />
        <Route path="interviews" element={<RecruiterInterviewsPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="candidate-detail/:id" element={<RecruiterCandidateDetailWrapper />} />
        <Route path="post-job" element={<RecruiterPostJobWrapper />} />
        <Route path="*" element={<UnderConstruction pageName="Recruiter Feature" />} />
      </Route>

      {/* Hiring Manager */}
      <Route path="/hiring" element={<ProtectedRoute allowedRoles={['hiring-manager']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HiringManagerDashboard />} />
        <Route path="requisitions" element={<RequisitionApprovals />} />
        <Route path="requisitions/new" element={<NewRequisitionPage onBack={() => navigate('/hiring/requisitions')} onSuccess={() => navigate('/hiring/requisitions')} />} />
        <Route path="shortlisting" element={<ShortlistingPage onViewCandidate={(id) => navigate(`/hiring/candidate-detail/${id}`)} />} />
        <Route path="candidate-detail/:id" element={<HMCandidateDetailWrapper />} />
        <Route path="approvals" element={<OfferApprovalPage />} />
        <Route path="interviews" element={<InterviewsPage />} />
        <Route path="*" element={<UnderConstruction pageName="Hiring Manager Feature" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors closeButton position="top-right" />
        <DialogHost />
      </BrowserRouter>
    </AuthProvider>
  );
}
