import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, Calendar, CheckCircle, ChevronRight, Clock, Copy, DollarSign, HelpCircle, MapPin, Plus, Trash2, GripVertical, X, FileText, CheckSquare, Linkedin, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Job, JobInput, JobStatus, createJob, updateJob, getJobById, getJobs } from '../../services/jobService';
import { Workflow, getWorkflows } from '../../services/workflowService';
import { BankQuestion, QuestionChoice, getQuestionBank, bankToJobQuestion } from '../../services/questionBankService';
import { getRequisitionById, markRequisitionPublished } from '../../services/requisitionService';
import { regenerateJobsFeed } from '../../services/feedService';
import { notifyJobAlertSubscribers } from '../../services/jobAlertService';

interface JobDetails {
    jobTitle: string;
    isConfidential: boolean;
    status: string;
    requisitionId: string;
    showOnCareerSite: boolean;
    jobType: string;
    department: string;
    location: string;
    remoteType: string;
    category: string;
    salaryMin: string;
    salaryMax: string;
    currency: string;
    referralProgram: boolean;
    referralEmployees: boolean;
    referralRewardCurrency: string;
    referralEndDate: string;
    description: string;
    tags: string;
}

interface JobSettings {
    isFeatured: boolean;
    allowLinkedInApply: boolean;
    requireCoverLetter: boolean;
    requireResume: boolean;
    hiringWorkflow: string;
    closingDate: string;
    recruitmentCost: string;
}

interface Question {
    id: string;
    text: string;
    type: 'text' | 'checkbox' | 'dropdown' | 'number' | 'file';
    mandatory: boolean;
    instructions: string;
    /** Expected answer for auto-scoring (checkbox: yes/no, number: minimum). */
    expectedAnswer?: string;
    /** Points awarded when the answer matches/passes. 0 = unscored. */
    score?: number;
    /** Per-choice points for checkbox (Yes/No) and dropdown questions. */
    choices?: QuestionChoice[];
}

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

const initialJobDetails: JobDetails = {
    jobTitle: '',
    isConfidential: false,
    status: 'Pending',
    requisitionId: '', // Will be generated
    showOnCareerSite: true,
    jobType: 'Full-time',
    department: '',
    location: '',
    remoteType: 'On-site',
    category: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    referralProgram: false,
    referralEmployees: false,
    referralRewardCurrency: 'USD',
    referralEndDate: '',
    description: '',
    tags: '',
};

const initialJobSettings: JobSettings = {
    isFeatured: false,
    allowLinkedInApply: true,
    requireCoverLetter: true,
    requireResume: true,
    hiringWorkflow: 'Standard',
    closingDate: '',
    recruitmentCost: '',
};

// Map a Firestore Job document into the local form state shape.
function jobToFormState(job: Job): { details: JobDetails; settings: JobSettings; questions: Question[]; team: StaffMember[]; coordinatorId: string } {
    return {
        details: {
            jobTitle: job.title,
            isConfidential: job.isConfidential,
            status: job.status,
            requisitionId: job.requisitionId || job.referenceNumber,
            showOnCareerSite: job.showOnCareerSite,
            jobType: job.jobType || 'Full-time',
            department: job.department || '',
            location: job.location || '',
            remoteType: job.remoteType || 'On-site',
            category: job.category || '',
            salaryMin: job.salaryMin || '',
            salaryMax: job.salaryMax || '',
            currency: job.currency || 'USD',
            referralProgram: false,
            referralEmployees: false,
            referralRewardCurrency: 'USD',
            referralEndDate: '',
            description: job.description || '',
            tags: job.tags || '',
        },
        settings: {
            isFeatured: job.isFeatured,
            allowLinkedInApply: true,
            requireCoverLetter: job.requireCoverLetter,
            requireResume: job.requireResume,
            hiringWorkflow: job.hiringWorkflow || 'Standard',
            closingDate: job.closingDate || '',
            recruitmentCost: job.recruitmentCost !== undefined ? String(job.recruitmentCost) : '',
        },
        questions: (job.questions || []).map((q) => ({
            id: q.id, text: q.text, type: q.type, mandatory: q.mandatory, instructions: q.instructions || '',
            expectedAnswer: q.expectedAnswer, score: q.score, choices: q.choices,
        })),
        team: job.hiringTeam || [],
        coordinatorId: job.coordinatorId || '',
    };
}

export function CreateJob({ onBack, onSubmit, editJobId, fromRequisitionId }: { onBack: () => void, onSubmit: () => void, onSkip?: () => void, editJobId?: string, fromRequisitionId?: string }) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [jobDetails, setJobDetails] = useState<JobDetails>(initialJobDetails);
    const [jobSettings, setJobSettings] = useState<JobSettings>(initialJobSettings);
    const [duplicateJobId, setDuplicateJobId] = useState('');
    const [existingJobs, setExistingJobs] = useState<Job[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);
    const [saving, setSaving] = useState(false);

    // Question Step State
    const [questionnaireHeading, setQuestionnaireHeading] = useState('Standard Pre-screening Questions');

    const initialQuestions: Question[] = [
        {
            id: 'q1',
            text: 'How many years of relevant experience do you have?',
            type: 'dropdown',
            mandatory: true,
            instructions: 'Please select from the options provided.'
        },
        {
            id: 'q2',
            text: 'Are you authorized to work in the required location?',
            type: 'checkbox',
            mandatory: true,
            instructions: ''
        }
    ];

    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [currentQuestion, setCurrentQuestion] = useState<Question>({
        id: '',
        text: '',
        type: 'text',
        mandatory: false,
        instructions: ''
    });

    // Hiring Team State
    const [hiringTeam, setHiringTeam] = useState<StaffMember[]>([]);
    const [hiringCoordinatorId, setHiringCoordinatorId] = useState<string>('');

    // Load staff (for the hiring team picker) and existing jobs (for duplication)
    useEffect(() => {
        (async () => {
            try {
                const [usersSnap, jobs, workflowList] = await Promise.all([
                    getDocs(collection(db, 'Users')),
                    getJobs(),
                    getWorkflows().catch(() => [] as Workflow[]),
                ]);
                setWorkflows(workflowList);
                getQuestionBank().then(setQuestionBank).catch(() => {});
                setStaffMembers(
                    usersSnap.docs
                        .map((d) => ({ id: d.id, ...(d.data() as any) }))
                        .filter((u) => u.role !== 'candidate')
                        .map((u) => ({ id: u.id, name: u.name || u.email, email: u.email || '', role: u.role || '' }))
                );
                setExistingJobs(jobs);
            } catch (err) {
                console.error('Failed to load staff/jobs', err);
            }
        })();
    }, []);

    // Prefill from an approved requisition (recruiter publish flow).
    useEffect(() => {
        if (!fromRequisitionId || editJobId) return;
        (async () => {
            const requisition = await getRequisitionById(fromRequisitionId);
            if (!requisition) return;
            setJobDetails(prev => ({
                ...prev,
                jobTitle: requisition.positionTitle,
                department: requisition.department,
                showOnCareerSite: requisition.advertType === 'external',
                requisitionId: requisition.referenceNumber,
                status: 'Active',
            }));
            setQuestions((requisition.questions ?? []).map(bankToJobQuestion));
        })();
    }, [fromRequisitionId, editJobId]);

    // Load the job being edited
    useEffect(() => {
        if (!editJobId) {
            setJobDetails(prev => ({ ...prev, requisitionId: 'Auto-generated on save' }));
            return;
        }
        (async () => {
            const job = await getJobById(editJobId);
            if (!job) return;
            const state = jobToFormState(job);
            setJobDetails(state.details);
            setJobSettings(state.settings);
            setQuestions(state.questions);
            setHiringTeam(state.team);
            setHiringCoordinatorId(state.coordinatorId);
        })();
    }, [editJobId]);

    const buildJobInput = (status: JobStatus): JobInput => ({
        title: jobDetails.jobTitle.trim() || 'Untitled Job',
        department: jobDetails.department.trim(),
        location: jobDetails.location.trim(),
        jobType: jobDetails.jobType,
        remoteType: jobDetails.remoteType,
        category: jobDetails.category,
        tags: jobDetails.tags,
        currency: jobDetails.currency,
        salaryMin: jobDetails.salaryMin,
        salaryMax: jobDetails.salaryMax,
        description: jobDetails.description,
        status,
        advertType: jobDetails.showOnCareerSite ? 'external' : 'internal',
        isConfidential: jobDetails.isConfidential,
        showOnCareerSite: jobDetails.showOnCareerSite,
        isFeatured: jobSettings.isFeatured,
        requireResume: jobSettings.requireResume,
        requireCoverLetter: jobSettings.requireCoverLetter,
        closingDate: jobSettings.closingDate,
        // Strip undefined fields — Firestore rejects undefined values.
        questions: questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            mandatory: q.mandatory,
            instructions: q.instructions,
            ...(q.score !== undefined && !Number.isNaN(q.score) ? { score: q.score } : {}),
            ...(q.expectedAnswer ? { expectedAnswer: q.expectedAnswer } : {}),
            ...(q.choices?.length ? { choices: q.choices.map((c) => ({ label: c.label, points: c.points })) } : {}),
        })),
        hiringTeam,
        coordinatorId: hiringCoordinatorId,
        requisitionId: jobDetails.requisitionId && jobDetails.requisitionId !== 'Auto-generated on save' ? jobDetails.requisitionId : undefined,
        hiringWorkflow: jobSettings.hiringWorkflow,
        ...(jobSettings.recruitmentCost.trim() && !Number.isNaN(Number(jobSettings.recruitmentCost))
            ? { recruitmentCost: Number(jobSettings.recruitmentCost) }
            : {}),
    });

    const handleSave = async (isDraft: boolean = false) => {
        if (!user) { toast.error('You must be signed in.'); return; }
        if (!jobDetails.jobTitle.trim()) { toast.error('Please enter a Job Title.'); return; }
        if (!jobDetails.description.trim()) { toast.error('Please enter a Job Description.'); return; }
        if (!jobDetails.location.trim()) { toast.error('Please enter a Location — this is required.'); return; }
        if (!isDraft) {
            if (hiringTeam.length === 0) { toast.error('Please add at least one member to the hiring team.'); return; }
            if (!hiringCoordinatorId) { toast.error('Please select a hiring team coordinator.'); return; }
        }

        const effectiveStatus: JobStatus = isDraft
            ? 'Draft'
            : (editJobId && jobDetails.status === 'Draft' ? 'Active' : (editJobId ? (jobDetails.status as JobStatus) : 'Active'));

        setSaving(true);
        try {
            if (editJobId) {
                await updateJob(editJobId, buildJobInput(effectiveStatus), user);
            } else {
                const created = await createJob(buildJobInput(effectiveStatus), user);
                if (fromRequisitionId && effectiveStatus === 'Active') {
                    await markRequisitionPublished(fromRequisitionId, created.id, user).catch(() => {});
                }
            }
            if (effectiveStatus === 'Active') {
                // Keep the public RSS feed in sync + tell subscribers (best-effort).
                regenerateJobsFeed().catch(() => {});
                notifyJobAlertSubscribers(jobDetails.jobTitle, jobDetails.location).catch(() => {});
            }
            if (isDraft) {
                toast.success('Draft saved successfully!');
                onSubmit();
            } else {
                toast.success(editJobId ? 'Job updated successfully!' : 'Job posted successfully!');
                onSubmit();
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save job.');
        } finally {
            setSaving(false);
        }
    };

    const steps = [
        { id: 1, label: 'Basic Job Details' },
        { id: 2, label: 'Application Form Fields' },
        { id: 3, label: 'Screening Questions' },
        { id: 4, label: 'Hiring Team' },
        { id: 5, label: 'Settings & Publication' },
    ];

    const handleDuplicateJob = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const jobId = e.target.value;
        setDuplicateJobId(jobId);
        if (jobId) {
            const templateJob = existingJobs.find(j => j.id === jobId);
            if (templateJob) {
                const state = jobToFormState(templateJob);
                setJobDetails(prev => ({
                    ...state.details,
                    requisitionId: prev.requisitionId, // new job gets its own reference
                    status: 'Pending',
                }));
                setQuestions(state.questions);
                setHiringTeam(state.team);
                setJobSettings(state.settings);
                setHiringCoordinatorId(state.coordinatorId);
            }
        }
    };

    const handleChange = (field: keyof JobDetails, value: any) => {
        setJobDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSettingsChange = (field: keyof JobSettings, value: any) => {
        setJobSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!jobDetails.jobTitle.trim()) {
                toast.error('Please enter a Job Title.');
                return;
            }
            if (!jobDetails.description.trim()) {
                toast.error('Please enter a Job Description.');
                return;
            }
            if (!jobDetails.location.trim()) {
                toast.error('Please enter a Location — this is required.');
                return;
            }
        }
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else onBack();
    };

    // Question Handlers
    const handleAddQuestion = () => {
        if (!currentQuestion.text.trim()) return;

        setQuestions(prev => [...prev, { ...currentQuestion, id: Math.random().toString(36).substr(2, 9) }]);

        // Reset form
        setCurrentQuestion({
            id: '',
            text: '',
            type: 'text',
            mandatory: false,
            instructions: ''
        });
    };

    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
        const newQuestions = [...questions];
        if (direction === 'up' && index > 0) {
            [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        } else if (direction === 'down' && index < newQuestions.length - 1) {
            [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        }
        setQuestions(newQuestions);
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    // Hiring Team Handlers
    const handleAddTeamMember = (member: StaffMember) => {
        if (!hiringTeam.find(m => m.id === member.id)) {
            setHiringTeam(prev => [...prev, member]);
        }
    };

    const handleRemoveTeamMember = (id: string) => {
        setHiringTeam(prev => prev.filter(m => m.id !== id));
        if (hiringCoordinatorId === id) {
            setHiringCoordinatorId('');
        }
    };

    const availableStaff = staffMembers.filter(member => !hiringTeam.find(m => m.id === member.id));

    const ROLE_LABELS: Record<string, string> = { admin: 'Admin', recruiter: 'Recruiter', 'hiring-manager': 'Hiring Manager' };

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-all duration-300">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowLeft className="size-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">
                        {editJobId ? 'Edit Job' : (currentStep === 5 ? 'Settings & Publication' : 'Create Job')}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    {currentStep !== 5 ? (
                        <Button style={{ backgroundColor: 'var(--pumpkin-orange)' }} onClick={handleNext}>
                            {currentStep === 4 ? 'Review & Publish' : 'Next Step'}
                            <ChevronRight className="size-4 ml-1" />
                        </Button>
                    ) : (
                        <Button style={{ backgroundColor: 'var(--pumpkin-orange)' }} disabled={saving} onClick={() => handleSave(false)}>
                            {saving ? 'Saving…' : (editJobId ? 'Save Changes' : 'Publish Job')} <CheckCircle className="size-4 ml-1" />
                        </Button>
                    )}

                </div>
            </div>

            {/* Progress Bar */}
            {currentStep <= 5 && (
                <div className="bg-white border-b border-gray-200 px-8 py-6 mb-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between relative">
                            {/* Connecting Line */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-0"></div>

                            {steps.map((step) => {
                                const isActive = step.id === currentStep;
                                const isCompleted = step.id < currentStep;

                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                        <div
                                            className={`size-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive
                                                ? 'bg-[var(--pumpkin-orange)] text-white shadow-lg shadow-orange-200 scale-110'
                                                : isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-white border-2 border-gray-200 text-gray-400'
                                                }`}
                                        >
                                            {isCompleted ? <CheckCircle className="size-6" /> : step.id}
                                        </div>
                                        <span className={`text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-[var(--pumpkin-orange)]' : 'text-gray-500'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-8">
                {currentStep === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Duplicate Job Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-shadow hover:shadow-md">
                            <div className="flex items-center gap-2 mb-4">
                                <Copy className="size-5 text-[var(--pumpkin-orange)]" />
                                <h3 className="text-lg font-bold text-gray-900">Duplicate Job</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Create a new job by copying details from an existing job template.</p>
                            <select
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/50 transition-all"
                                value={duplicateJobId}
                                onChange={handleDuplicateJob}
                            >
                                <option value="">Select a job to duplicate...</option>
                                {existingJobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title} ({job.referenceNumber})</option>
                                ))}
                            </select>
                        </div>

                        {/* Basic Details Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Basic Job Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. Senior Product Designer"
                                        value={jobDetails.jobTitle}
                                        onChange={(e) => handleChange('jobTitle', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Requisition ID</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                                            value={jobDetails.requisitionId}
                                            readOnly
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 flex items-center gap-1">
                                            <HelpCircle className="size-3" /> Auto-generated
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Status</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobDetails.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100 transition-colors hover:bg-blue-50">
                                    <input
                                        type="checkbox"
                                        id="confidential"
                                        className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                        checked={jobDetails.isConfidential}
                                        onChange={(e) => handleChange('isConfidential', e.target.checked)}
                                    />
                                    <label htmlFor="confidential" className="text-sm text-gray-700 cursor-pointer select-none w-full">
                                        <span className="font-semibold block text-gray-900">Confidential Job</span>
                                        <span className="text-gray-500">Job will not appear on career site but will be published on internal boards.</span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-lg border border-green-100 transition-colors hover:bg-green-50">
                                    <input
                                        type="checkbox"
                                        id="careerSite"
                                        className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                        checked={jobDetails.showOnCareerSite}
                                        onChange={(e) => handleChange('showOnCareerSite', e.target.checked)}
                                    />
                                    <label htmlFor="careerSite" className="text-sm text-gray-700 cursor-pointer select-none w-full">
                                        <span className="font-semibold block text-gray-900">Show on Career Site</span>
                                        <span className="text-gray-500">Job will be visible to external candidates on your portal.</span>
                                    </label>
                                </div>

                                {/* Job Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobDetails.jobType}
                                        onChange={(e) => handleChange('jobType', e.target.value)}
                                    >
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Temporary</option>
                                        <option>Permanent</option>
                                        <option>Casual</option>
                                        <option>Paid Internship</option>
                                        <option>Unpaid Volunteer</option>
                                        <option>Seasonal</option>
                                    </select>
                                </div>

                                {/* Remote Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remote Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobDetails.remoteType}
                                        onChange={(e) => handleChange('remoteType', e.target.value)}
                                    >
                                        <option>On-site</option>
                                        <option>Remote</option>
                                        <option>Hybrid</option>
                                    </select>
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all mb-2"
                                        value={[
                                            'Business Development', 'Customer Service', 'Design', 'Engineering',
                                            'Finance and Accounting', 'Human Resources', 'Information Technology',
                                            'Legal', 'Marketing', 'Operations', 'Product', 'Sales', 'Software Development'
                                        ].includes(jobDetails.department) ? jobDetails.department : (jobDetails.department ? 'Other' : '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'Other') {
                                                handleChange('department', ' ');
                                            } else {
                                                handleChange('department', val);
                                            }
                                        }}
                                    >
                                        <option value="">Select Department</option>
                                        <option>Business Development</option>
                                        <option>Customer Service</option>
                                        <option>Design</option>
                                        <option>Engineering</option>
                                        <option>Finance and Accounting</option>
                                        <option>Human Resources</option>
                                        <option>Information Technology</option>
                                        <option>Legal</option>
                                        <option>Marketing</option>
                                        <option>Operations</option>
                                        <option>Product</option>
                                        <option>Sales</option>
                                        <option>Software Development</option>
                                        <option value="Other">Other</option>
                                    </select>

                                    {(![
                                        'Business Development', 'Customer Service', 'Design', 'Engineering',
                                        'Finance and Accounting', 'Human Resources', 'Information Technology',
                                        'Legal', 'Marketing', 'Operations', 'Product', 'Sales', 'Software Development', ''
                                    ].includes(jobDetails.department)) && (
                                            <input
                                                type="text"
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all animate-in fade-in slide-in-from-top-1"
                                                placeholder="Enter department name"
                                                value={jobDetails.department === ' ' ? '' : jobDetails.department}
                                                onChange={(e) => handleChange('department', e.target.value)}
                                                autoFocus
                                            />
                                        )}
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. San Francisco, CA"
                                        value={jobDetails.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. Software Development"
                                        value={jobDetails.category}
                                        onChange={(e) => handleChange('category', e.target.value)}
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. React, TypeScript, Senior"
                                        value={jobDetails.tags}
                                        onChange={(e) => handleChange('tags', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Salary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobDetails.currency}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    >
                                        <option>KES (Ksh)</option>
                                        <option>USD ($)</option>
                                        <option>EUR (â‚¬)</option>
                                        <option>GBP (Â£)</option>
                                        <option>CAD ($)</option>
                                    </select>
                                </div>

                                {/* Min Salary */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="0"
                                        value={jobDetails.salaryMin}
                                        onChange={(e) => handleChange('salaryMin', e.target.value)}
                                    />
                                </div>

                                {/* Max Salary */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="0"
                                        value={jobDetails.salaryMax}
                                        onChange={(e) => handleChange('salaryMax', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Job Description */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Description <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-lg min-h-[150px] focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                    placeholder="Enter detailed job description here..."
                                    value={jobDetails.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </div>

                            {/* Referral Program Section */}
                            <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 transition-colors hover:bg-gray-100/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="referralProgram"
                                        className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                        checked={jobDetails.referralProgram}
                                        onChange={(e) => handleChange('referralProgram', e.target.checked)}
                                    />
                                    <label htmlFor="referralProgram" className="font-bold text-gray-900 cursor-pointer select-none">
                                        Add to Employee Referral Program
                                    </label>
                                </div>

                                {jobDetails.referralProgram && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="md:col-span-3">
                                            <div className="flex items-center gap-3 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="referralEmployees"
                                                    className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                                    checked={jobDetails.referralEmployees}
                                                    onChange={(e) => handleChange('referralEmployees', e.target.checked)}
                                                />
                                                <label htmlFor="referralEmployees" className="text-sm text-gray-700 cursor-pointer select-none">
                                                    Allow all employees to refer candidates
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reward Currency</label>
                                            <select
                                                className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                                value={jobDetails.referralRewardCurrency}
                                                onChange={(e) => handleChange('referralRewardCurrency', e.target.value)}
                                            >
                                                <option>USD ($)</option>
                                                <option>Points</option>
                                                <option>Gift Card</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Program End Date</label>
                                            <input
                                                type="date"
                                                className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                                value={jobDetails.referralEndDate}
                                                onChange={(e) => handleChange('referralEndDate', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 pb-8">
                            <Button variant="outline" size="lg" className="px-8" onClick={() => handleSave(true)}>Save Draft</Button>
                            <Button
                                size="lg"
                                className="px-8"
                                style={{ backgroundColor: 'var(--pumpkin-orange)' }}
                                onClick={handleNext}
                            >
                                Next Step
                            </Button>
                        </div>

                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Application Form Fields */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Application Form Fields</h2>
                            <p className="text-gray-500 mb-6">Configure the mandatory information required from all candidates when they apply.</p>

                            <div className="space-y-4">
                                {/* Fixed Mandatory Fields */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900">Personal Information</div>
                                        <div className="text-sm text-gray-500">First Name, Last Name, Email Address, Mobile Number</div>
                                    </div>
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Always Required</span>
                                </div>

                                {/* Configurable Mandatory Fields */}
                                <div className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="font-medium text-gray-900">Resume / CV</div>
                                        <div className="text-sm text-gray-500">Require candidates to upload a resume file</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={jobSettings.requireResume}
                                            onChange={(e) => handleSettingsChange('requireResume', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pumpkin-orange)]"></div>
                                    </label>
                                </div>

                                <div className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="font-medium text-gray-900">Cover Letter</div>
                                        <div className="text-sm text-gray-500">Require candidates to provide a cover letter</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={jobSettings.requireCoverLetter}
                                            onChange={(e) => handleSettingsChange('requireCoverLetter', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pumpkin-orange)]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 pb-8">
                            <Button variant="outline" size="lg" className="px-8" onClick={handleBack}>Back</Button>
                            <Button variant="outline" size="lg" className="px-8" onClick={() => handleSave(true)}>Save Draft</Button>
                            <Button
                                size="lg"
                                className="px-8"
                                style={{ backgroundColor: 'var(--pumpkin-orange)' }}
                                onClick={handleNext}
                            >
                                Next Step
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Questions Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Screening Questions</h2>
                            <p className="text-gray-500 mb-6">Create questions to prescreen candidates. You can ask for specific skills, experience, or other requirements.</p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Questionnaire Heading</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                    placeholder="e.g. Initial Screening Questions"
                                    value={questionnaireHeading}
                                    onChange={(e) => setQuestionnaireHeading(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Existing Questions List */}
                        {questions.length > 0 && (
                            <div className="space-y-4">
                                {questions.map((question, index) => (
                                    <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-all hover:shadow-md group">
                                        <div className="mt-1 text-gray-400 group-hover:text-[var(--pumpkin-orange)] transition-colors">
                                            <GripVertical className="size-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold text-gray-900">{question.text}</h3>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex items-center mr-2 border-r border-gray-200 pr-2">
                                                        <button
                                                            onClick={() => handleMoveQuestion(index, 'up')}
                                                            disabled={index === 0}
                                                            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Move Up"
                                                        >
                                                            <ChevronUp className="size-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveQuestion(index, 'down')}
                                                            disabled={index === questions.length - 1}
                                                            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Move Down"
                                                        >
                                                            <ChevronDown className="size-4" />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => handleDeleteQuestion(question.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase font-medium">{question.type}</span>
                                                {question.mandatory && (
                                                    <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs uppercase font-medium">Mandatory</span>
                                                )}
                                                {(!!question.score || !!question.choices?.length) && (
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs uppercase font-medium">
                                                        {question.choices?.length
                                                          ? question.choices.map((c) => `${c.label} = ${c.points} pts`).join(' · ')
                                                          : `${question.score} pts${question.expectedAnswer ? ` • expects ${question.expectedAnswer}` : ''}`}
                                                    </span>
                                                )}
                                            </div>
                                            {question.instructions && (
                                                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                                                    <span className="font-medium text-gray-700">Instructions:</span> {question.instructions}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add from the shared question library */}
                        {questionBank.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Add from Question Library</h3>
                                <p className="text-sm text-gray-500 mb-4">Questions maintained by admins in the Pre-screening Builder.</p>
                                <div className="flex flex-wrap gap-2">
                                    {questionBank.map((bq) => {
                                        const alreadyAdded = questions.some((q) => q.text === bq.text);
                                        return (
                                            <button
                                                key={bq.id}
                                                type="button"
                                                disabled={alreadyAdded}
                                                onClick={() => setQuestions((prev) => [...prev, bankToJobQuestion(bq)])}
                                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${alreadyAdded
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'bg-orange-50 text-[var(--pumpkin-orange)] border-orange-200 hover:bg-[var(--pumpkin-orange)] hover:text-white'}`}
                                                title={alreadyAdded ? 'Already added' : `${bq.type}${bq.choices?.length ? ` • ${bq.choices.map((c) => `${c.label} = ${c.points} pts`).join(' · ')}` : bq.score ? ` • ${bq.score} pts` : ''}`}
                                            >
                                                + {bq.text}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Add/Edit Question Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md border-l-4 border-l-[var(--pumpkin-orange)]">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Plus className="size-5" />
                                Add New Question
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. How many years of experience do you have with React?"
                                        value={currentQuestion.text}
                                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={currentQuestion.type}
                                        onChange={(e) => {
                                            const newType = e.target.value as Question['type'];
                                            setCurrentQuestion(prev => {
                                                const next: Question = { ...prev, type: newType };
                                                if (newType === 'checkbox') {
                                                    // Always normalize to a Yes/No pair, keeping points if labels match.
                                                    const pts = (label: string) => prev.choices?.find(c => c.label.toLowerCase() === label.toLowerCase())?.points ?? 0;
                                                    next.choices = [{ label: 'Yes', points: pts('Yes') }, { label: 'No', points: pts('No') }];
                                                    next.expectedAnswer = undefined;
                                                    next.score = undefined;
                                                } else if (newType === 'dropdown') {
                                                    next.choices = prev.choices?.length ? prev.choices : [{ label: 'New Option', points: 0 }];
                                                    next.expectedAnswer = undefined;
                                                    next.score = undefined;
                                                } else {
                                                    next.choices = undefined;
                                                }
                                                return next;
                                            });
                                        }}
                                    >
                                        <option value="text">Single Line Text</option>
                                        <option value="checkbox">Checkbox (Yes/No)</option>
                                        <option value="dropdown">Dropdown Selection</option>
                                        <option value="number">Numeric Input</option>
                                        <option value="file">File Upload</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="mandatoryQuestion"
                                        className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                        checked={currentQuestion.mandatory}
                                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, mandatory: e.target.checked }))}
                                    />
                                    <label htmlFor="mandatoryQuestion" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                        Mandatory question
                                    </label>
                                </div>

                                {currentQuestion.type !== 'checkbox' && currentQuestion.type !== 'dropdown' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Score (points)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                            placeholder="0 = unscored"
                                            value={currentQuestion.score ?? ''}
                                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, score: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Points added to the candidate's screening score when the answer passes.</p>
                                    </div>
                                )}

                                {currentQuestion.type === 'number' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum value to pass</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                            placeholder="e.g. 5 (years)"
                                            value={currentQuestion.expectedAnswer ?? ''}
                                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, expectedAnswer: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {currentQuestion.type === 'checkbox' && (
                                    (currentQuestion.choices?.length === 2
                                        ? currentQuestion.choices
                                        : [{ label: 'Yes', points: 0 }, { label: 'No', points: 0 }]
                                    ).map((choice, idx) => (
                                        <div key={choice.label}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Points for {choice.label}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                                value={choice.points}
                                                onChange={(e) => setCurrentQuestion(prev => {
                                                    const base = prev.choices?.length === 2
                                                        ? prev.choices
                                                        : [{ label: 'Yes', points: 0 }, { label: 'No', points: 0 }];
                                                    const newChoices = [...base];
                                                    newChoices[idx] = { ...newChoices[idx], points: parseInt(e.target.value) || 0 };
                                                    return { ...prev, choices: newChoices };
                                                })}
                                            />
                                        </div>
                                    ))
                                )}

                                {currentQuestion.type === 'dropdown' && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Options & Points</label>
                                        <div className="space-y-2">
                                            {(currentQuestion.choices || []).map((choice, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                                        placeholder="Option label"
                                                        value={choice.label}
                                                        onChange={(e) => setCurrentQuestion(prev => {
                                                            const newChoices = [...(prev.choices || [])];
                                                            newChoices[idx] = { ...newChoices[idx], label: e.target.value };
                                                            return { ...prev, choices: newChoices };
                                                        })}
                                                    />
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="w-24 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                                        placeholder="Pts"
                                                        value={choice.points}
                                                        onChange={(e) => setCurrentQuestion(prev => {
                                                            const newChoices = [...(prev.choices || [])];
                                                            newChoices[idx] = { ...newChoices[idx], points: parseInt(e.target.value) || 0 };
                                                            return { ...prev, choices: newChoices };
                                                        })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentQuestion(prev => {
                                                            const newChoices = [...(prev.choices || [])];
                                                            newChoices.splice(idx, 1);
                                                            return { ...prev, choices: newChoices };
                                                        })}
                                                        className="p-2 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                type="button"
                                                onClick={() => setCurrentQuestion(prev => ({
                                                    ...prev,
                                                    choices: [...(prev.choices || []), { label: 'New Option', points: 0 }],
                                                }))}
                                            >
                                                <Plus className="size-3 mr-1" /> Add Option
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">The candidate's score is the points of the option they pick.</p>
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-lg min-h-[100px] focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="Any special instructions for the candidate..."
                                        value={currentQuestion.instructions}
                                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, instructions: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button
                                    onClick={handleAddQuestion}
                                    disabled={!currentQuestion.text.trim()}
                                    style={{ backgroundColor: !currentQuestion.text.trim() ? '#ccc' : 'var(--pumpkin-orange)' }}
                                >
                                    Add Question
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pb-8">
                            <Button variant="outline" size="lg" className="px-8" onClick={handleBack}>Back</Button>
                            <Button variant="outline" size="lg" className="px-8" onClick={() => handleSave(true)}>Save Draft</Button>
                            <Button
                                size="lg"
                                className="px-8"
                                style={{ backgroundColor: 'var(--pumpkin-orange)' }}
                                onClick={handleNext}
                            >
                                Next Step
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Hiring Team Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Hiring Team & Recruiters</h2>
                            <p className="text-gray-500 mb-6">Select recruiters and team members who will have access to candidates and be part of the hiring process.</p>

                            {/* Add Members Section */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add Members <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                    value=""
                                    onChange={(e) => {
                                        const member = availableStaff.find(m => m.id === e.target.value);
                                        if (member) handleAddTeamMember(member);
                                    }}
                                >
                                    <option value="" disabled>
                                        {availableStaff.length > 0 ? 'Select a team member…' : 'All staff members have been added'}
                                    </option>
                                    {availableStaff.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} — {ROLE_LABELS[member.role] || member.role}{member.email ? ` (${member.email})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Members List */}
                            {hiringTeam.length > 0 && (
                                <div className="space-y-3 mb-8">
                                    <h3 className="text-sm font-semibold text-gray-900">Selected Members ({hiringTeam.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {hiringTeam.map(member => (
                                            <div key={member.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 bg-[var(--pumpkin-orange)]/10 text-[var(--pumpkin-orange)] rounded-full flex items-center justify-center font-bold text-xs">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                                                        <div className="text-xs text-gray-500">{member.role}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveTeamMember(member.id)}
                                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hiring Coordinator Selection */}
                            <div className="bg-[var(--pumpkin-orange)]/5 rounded-lg border border-[var(--pumpkin-orange)]/10 p-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hiring Team Coordinator <span className="text-red-500">*</span></label>
                                <p className="text-xs text-gray-500 mb-4">Select one person from the hiring team to be the primary point of contact.</p>

                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none bg-white transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                    value={hiringCoordinatorId}
                                    onChange={(e) => setHiringCoordinatorId(e.target.value)}
                                    disabled={hiringTeam.length === 0}
                                >
                                    <option value="">Select a coordinator...</option>
                                    {hiringTeam.map(member => (
                                        <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pb-8">
                            <Button variant="outline" size="lg" className="px-8" onClick={handleBack}>Back</Button>
                            <Button variant="outline" size="lg" className="px-8" onClick={() => handleSave(true)}>Save Draft</Button>
                            <Button
                                size="lg"
                                className="px-8"
                                style={{ backgroundColor: 'var(--pumpkin-orange)' }}
                                onClick={handleNext}
                            >
                                Next Step
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Settings & Publishing</h2>
                            
                            {/* Workflow and Closing Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Workflow</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobSettings.hiringWorkflow}
                                        onChange={(e) => handleSettingsChange('hiringWorkflow', e.target.value)}
                                    >
                                        <option value="Standard">Standard Workflow</option>
                                        {workflows.map((w) => (
                                            <option key={w.id} value={w.name}>
                                                {w.name} ({w.stages.map((s) => s.name).join(' → ')})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Workflows are managed by admins under Workflow Configuration.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        value={jobSettings.closingDate}
                                        onChange={(e) => handleSettingsChange('closingDate', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Job will automatically close for new applications on this date.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recruitment Cost (optional)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
                                        placeholder="e.g. 45000"
                                        value={jobSettings.recruitmentCost}
                                        onChange={(e) => handleSettingsChange('recruitmentCost', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Advertising/agency costs for this vacancy — feeds the cost-per-hire report.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4">Job Board Visibility & Application Options</h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900">Featured Job</div>
                                                <div className="text-xs text-gray-500">Highlight this job on the career site</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                                checked={jobSettings.isFeatured}
                                                onChange={(e) => handleSettingsChange('isFeatured', e.target.checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    <Linkedin className="size-4 text-blue-600" /> LinkedIn Apply
                                                </div>
                                                <div className="text-xs text-gray-500">Allow candidates to apply via LinkedIn</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
                                                checked={jobSettings.allowLinkedInApply}
                                                onChange={(e) => handleSettingsChange('allowLinkedInApply', e.target.checked)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Component (Always visible in Step 5 alongside Settings) */}
                {currentStep === 5 && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-[var(--pumpkin-orange)]/10 p-6 border-b border-[var(--pumpkin-orange)]/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{jobDetails.jobTitle}</h2>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                            <span>{jobDetails.department}</span>
                                            <span>{jobDetails.location} ({jobDetails.remoteType})</span>
                                            <span className="font-mono">{jobDetails.requisitionId}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-3 py-1 bg-[var(--pumpkin-orange)] text-white rounded-full text-sm font-medium">
                                            Ready to Review
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <FileText className="size-4 text-gray-400" /> Basic Details
                                    </h3>
                                    <dl className="grid grid-cols-2 gap-4 text-sm">
                                        <dt className="text-gray-500">Status</dt>
                                        <dd className="font-medium text-gray-900">{jobDetails.status}</dd>

                                        <dt className="text-gray-500">Job Type</dt>
                                        <dd className="font-medium text-gray-900">{jobDetails.jobType}</dd>

                                        <dt className="text-gray-500">Salary Range</dt>
                                        <dd className="font-medium text-gray-900">
                                            {jobDetails.currency} {jobDetails.salaryMin} - {jobDetails.salaryMax}
                                        </dd>

                                        <dt className="text-gray-500">Confidential</dt>
                                        <dd className="font-medium text-gray-900">{jobDetails.isConfidential ? 'Yes' : 'No'}</dd>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <CheckSquare className="size-4 text-gray-400" /> Configuration
                                    </h3>
                                    <dl className="grid grid-cols-2 gap-4 text-sm">
                                        <dt className="text-gray-500">Screening Questions</dt>
                                        <dd className="font-medium text-gray-900">{questions.length} Questions</dd>

                                        <dt className="text-gray-500">Hiring Team</dt>
                                        <dd className="font-medium text-gray-900">{hiringTeam.length} Members</dd>

                                        <dt className="text-gray-500">Coordinator</dt>
                                        <dd className="font-medium text-gray-900">
                                            {hiringTeam.find(m => m.id === hiringCoordinatorId)?.name || 'Not selected'}
                                        </dd>

                                        <dt className="text-gray-500">Closing Date</dt>
                                        <dd className="font-medium text-gray-900">{jobSettings.closingDate || 'No date set'}</dd>

                                        <dt className="text-gray-500">Workflow</dt>
                                        <dd className="font-medium text-gray-900">{jobSettings.hiringWorkflow}</dd>
                                    </dl>

                                    {/* Questions and Team lists shown on review */}
                                    {questions.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="text-xs font-bold text-[var(--pumpkin-orange)] uppercase mb-2">Mandatory & Screening Questions</div>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                                {questions.map((q) => (
                                                    <li key={q.id} className="text-[13px] text-gray-700 flex items-center gap-2">
                                                        <div className="size-1.5 rounded-full bg-gray-300" />
                                                        <span className="font-medium">{q.text}</span>
                                                        {q.mandatory && <span className="text-red-500 text-[10px] font-bold">REQUIRED</span>}
                                                        <span className="text-gray-400 text-[11px] ml-auto uppercase">{q.type}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Team Members</div>
                                        <div className="flex flex-wrap gap-2">
                                            {hiringTeam.map(m => (
                                                <span key={m.id} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                                                    {m.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-6 border-t border-gray-100 flex items-center justify-between bg-gray-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <ExternalLink className="size-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Preview Job Post</h4>
                                            <p className="text-sm text-gray-500">See how this job looks to candidates on the career portal.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" onClick={() => setShowPreview(true)}>Preview</Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 py-4">
                            <Button variant="outline" size="lg" className="px-12 w-48" onClick={handleBack}>
                                Back to Edit
                            </Button>
                            <Button
                                size="lg"
                                className="px-12 w-64 bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 shadow-lg shadow-orange-200"
                                disabled={saving}
                                onClick={() => handleSave(false)}
                            >
                                {saving ? 'Saving…' : (editJobId && jobDetails.status === 'Draft' ? 'Publish Job' : (editJobId ? 'Save Changes' : 'Publish Job'))} <CheckCircle className="ml-2 size-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Candidate-view preview modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Job Post Preview</h3>
                                <p className="text-xs text-gray-500">How this job looks to candidates on the career portal</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                            <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
                                <h1 className="text-3xl font-semibold mb-2">{jobDetails.jobTitle || 'Untitled Job'}</h1>
                                {jobDetails.requisitionId && (
                                    <p className="text-sm text-gray-400 font-mono mb-4">{jobDetails.requisitionId}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
                                    <span className="flex items-center gap-2">
                                        <Briefcase className="size-5" />
                                        {jobDetails.department || 'General'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <MapPin className="size-5" />
                                        {jobDetails.location || '—'} {jobDetails.remoteType ? `(${jobDetails.remoteType})` : ''}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <DollarSign className="size-5" />
                                        {jobDetails.salaryMin || jobDetails.salaryMax
                                            ? `${jobDetails.currency || ''} ${jobDetails.salaryMin || '?'} – ${jobDetails.salaryMax || '?'}`.trim()
                                            : 'Competitive'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="size-5" />
                                        {jobDetails.jobType}
                                    </span>
                                    {jobSettings.closingDate && (
                                        <span className="flex items-center gap-2 text-red-500">
                                            <Calendar className="size-5" />
                                            Closes: {jobSettings.closingDate}
                                        </span>
                                    )}
                                </div>
                                <Button size="lg" className="px-8 pointer-events-none" style={{ backgroundColor: 'var(--blue-accent)' }}>
                                    Apply for This Position
                                </Button>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
                                <section>
                                    <h2 className="text-xl font-semibold mb-4">About the Role</h2>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                        {jobDetails.description || 'No description yet.'}
                                    </p>
                                </section>

                                {(jobDetails.tags || '').split(',').map((t) => t.trim()).filter(Boolean).length > 0 && (
                                    <>
                                        <div className="border-t border-gray-200" />
                                        <section>
                                            <h2 className="text-xl font-semibold mb-4">Skills & Keywords</h2>
                                            <div className="flex flex-wrap gap-2">
                                                {(jobDetails.tags || '').split(',').map((t) => t.trim()).filter(Boolean).map((tag, index) => (
                                                    <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </section>
                                    </>
                                )}

                                {questions.length > 0 && (
                                    <>
                                        <div className="border-t border-gray-200" />
                                        <section>
                                            <h2 className="text-xl font-semibold mb-2">Pre-screening</h2>
                                            <p className="text-gray-600 text-sm">
                                                This application includes {questions.length} pre-screening question{questions.length > 1 ? 's' : ''}.
                                            </p>
                                        </section>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-white">
                            <Button variant="outline" onClick={() => setShowPreview(false)}>Close Preview</Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

