import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { Job, ScreeningQuestion } from '../../services/jobService';
import { applyToJob, hasAppliedToJob, ScreeningAnswer } from '../../services/applicationService';
import { CandidateProfile, getCandidateProfile } from '../../services/profileService';
import { STORAGE_ENABLED } from '../../lib/featureFlags';

interface ApplicationFormProps {
  job: Job;
  onBack: () => void;
  onSubmit: () => void;
}

export function ApplicationForm({ job, onBack, onSubmit }: ApplicationFormProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    city: '',
    country: '',
    workedHereBefore: false,
    source: 'career-site',
    consent: false,
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>({});
  const [useSavedCv, setUseSavedCv] = useState(false);

  const questions: ScreeningQuestion[] = job.questions ?? [];

  // Duplicate-application check + profile prefill.
  useEffect(() => {
    if (user) {
      hasAppliedToJob(user.id, job.id).then(setAlreadyApplied).catch(() => {});
      getCandidateProfile(user.id)
        .then((p) => {
          setProfile(p);
          if (p.cvUrl) setUseSavedCv(true);
          setFormData((prev) => ({
            ...prev,
            phone: prev.phone || p.phone || '',
            dateOfBirth: prev.dateOfBirth || p.dateOfBirth || '',
            gender: prev.gender || p.gender || '',
            nationality: prev.nationality || p.nationality || '',
            city: prev.city || p.city || '',
            country: prev.country || p.country || '',
          }));
        })
        .catch(() => {});
    }
  }, [user, job.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'coverLetter') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'resume') setResumeFile(e.target.files[0]);
      else setCoverLetterFile(e.target.files[0]);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center max-w-md">
          <AlertCircle className="size-10 text-autumn-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to apply</h2>
          <p className="text-gray-600 mb-6">
            You need a candidate account to apply for {job.title}. Your profile lets you track your application status.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button style={{ backgroundColor: 'var(--pumpkin-orange)' }} onClick={() => navigate('/login')}>
              Sign in / Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyApplied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center max-w-md">
          <CheckCircle2 className="size-10 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">You've already applied</h2>
          <p className="text-gray-600 mb-6">
            You have an existing application for {job.title}. Duplicate applications for the same job are not allowed.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>Back to jobs</Button>
            <Button style={{ backgroundColor: 'var(--pumpkin-orange)' }} onClick={() => navigate('/candidate/dashboard')}>
              View my applications
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const screeningAnswers: ScreeningAnswer[] = questions.map((q) => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id] ?? '',
      }));

      await applyToJob({
        job,
        candidate: { id: user.id, name: user.name, email: user.email },
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        nationality: formData.nationality,
        city: formData.city,
        country: formData.country,
        workedHereBefore: formData.workedHereBefore,
        source: formData.source,
        cvFile: resumeFile,
        existingCv:
          !resumeFile && useSavedCv && profile.cvUrl
            ? { url: profile.cvUrl, name: profile.cvFileName || 'CV' }
            : null,
        coverLetterFile,
        answers: screeningAnswers,
        consentGiven: formData.consent,
      });
      onSubmit();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (q: ScreeningQuestion) => {
    const common =
      'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
    const value = answers[q.id] ?? '';
    const set = (v: string) => setAnswers((prev) => ({ ...prev, [q.id]: v }));

    switch (q.type) {
      case 'checkbox':
        return (
          <select required={q.mandatory} value={value} onChange={(e) => set(e.target.value)} className={common}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        );
      case 'number':
        return (
          <input type="number" required={q.mandatory} value={value} onChange={(e) => set(e.target.value)} className={common} />
        );
      case 'dropdown':
        return q.choices?.length ? (
          <select required={q.mandatory} value={value} onChange={(e) => set(e.target.value)} className={common}>
            <option value="">Select…</option>
            {q.choices.map((c) => (
              <option key={c.label} value={c.label}>{c.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            required={q.mandatory}
            value={value}
            onChange={(e) => set(e.target.value)}
            className={common}
            placeholder="Your answer"
          />
        );
      default:
        return (
          <textarea
            required={q.mandatory}
            rows={3}
            value={value}
            onChange={(e) => set(e.target.value)}
            className={`${common} resize-none`}
            placeholder="Your answer…"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-semibold mb-2">Apply for {job.title}</h1>
          <p className="text-gray-600">
            {job.referenceNumber} • {job.location} • Applying as <span className="font-medium">{user.name}</span> ({user.email})
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          {/* Bio data */}
          <section>
            <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Gender <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Nationality <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Current City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Country of Residence <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="workedBefore"
                  checked={formData.workedHereBefore}
                  onChange={(e) => setFormData({ ...formData, workedHereBefore: e.target.checked })}
                  className="size-4"
                />
                <label htmlFor="workedBefore" className="text-sm text-gray-700">
                  I have worked for Autumhire before
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-700 mb-2 block">How did you hear about this job?</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="career-site">Career site</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="referral">Employee referral</option>
                  <option value="agency">Recruitment agency</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          {/* Documents checklist */}
          <section>
            <h2 className="text-xl font-semibold mb-2">Required Documents</h2>
            {!STORAGE_ENABLED && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-4 text-sm">
                Document uploads are temporarily unavailable — you can submit your application without attachments and send documents later if requested.
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              Checklist: {job.requireResume !== false ? 'CV/Resume (required)' : 'CV/Resume (optional)'} •{' '}
              {job.requireCoverLetter ? 'Cover letter (required)' : 'Cover letter (optional)'}
            </p>
            <div className="space-y-4">
              {profile.cvUrl && !resumeFile && (
                <label className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSavedCv}
                    onChange={(e) => setUseSavedCv(e.target.checked)}
                    className="size-4"
                  />
                  <span className="text-sm text-gray-700">
                    Use my saved CV: <span className="font-medium">{profile.cvFileName}</span>
                  </span>
                </label>
              )}
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${resumeFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                {resumeFile ? (
                  <div className="text-green-700">
                    <CheckCircle2 className="size-8 mx-auto mb-3" />
                    <p className="font-medium">{resumeFile.name}</p>
                    <p className="text-sm text-green-600 mt-1">Resume ready to upload</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-1">Upload Resume/CV {job.requireResume !== false && <span className="text-red-500">*</span>}</p>
                    <p className="text-sm text-gray-500 mb-3">PDF, DOC, or DOCX (max 5MB)</p>
                    <div className="relative inline-block">
                      <Button type="button" variant="outline" size="sm" className="pointer-events-none">Choose File</Button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required={STORAGE_ENABLED && job.requireResume !== false && !(useSavedCv && !!profile.cvUrl)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'resume')}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${coverLetterFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                {coverLetterFile ? (
                  <div className="text-green-700">
                    <CheckCircle2 className="size-8 mx-auto mb-3" />
                    <p className="font-medium">{coverLetterFile.name}</p>
                    <p className="text-sm text-green-600 mt-1">Cover letter ready to upload</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-1">Upload Cover Letter {job.requireCoverLetter && <span className="text-red-500">*</span>}</p>
                    <p className="text-sm text-gray-500 mb-3">PDF, DOC, or DOCX (max 5MB)</p>
                    <div className="relative inline-block">
                      <Button type="button" variant="outline" size="sm" className="pointer-events-none">Choose File</Button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required={STORAGE_ENABLED && !!job.requireCoverLetter}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'coverLetter')}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Job-specific pre-screening questions */}
          {questions.length > 0 && (
            <>
              <div className="border-t border-gray-200" />
              <section>
                <h2 className="text-xl font-semibold mb-6">Pre-screening Questions</h2>
                <div className="space-y-6">
                  {questions.map((q) => (
                    <div key={q.id}>
                      <label className="text-sm text-gray-700 mb-2 block">
                        {q.text} {q.mandatory && <span className="text-red-500">*</span>}
                      </label>
                      {q.instructions && <p className="text-xs text-gray-500 mb-2">{q.instructions}</p>}
                      {renderQuestion(q)}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <div className="border-t border-gray-200" />

          {/* Consent / accuracy clause */}
          <section>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="mt-1 size-4"
              />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Declaration & Data Processing Consent <span className="text-red-500">*</span></p>
                <p className="text-gray-600">
                  I confirm that the information provided in this application is correct. I understand that it will be
                  verified and that my application will be disqualified if any information is confirmed to be false.
                  I consent to the processing of my personal data for recruitment purposes.
                </p>
              </div>
            </div>
          </section>

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="px-8" disabled={submitting} style={{ backgroundColor: 'var(--blue-accent)' }}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
