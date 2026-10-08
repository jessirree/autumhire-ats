import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Briefcase, Clock, DollarSign, Calendar, AlertCircle, GraduationCap, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Job, getJobById, isJobOpen } from '../../services/jobService';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { EDUCATION_LABELS } from '../../lib/education';

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  onApply: () => void;
}

export function JobDetail({ jobId, onBack, onApply }: JobDetailProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobById(jobId)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Loading job…
      </div>
    );
  }

  // Closed / missing jobs must show "no longer available" rather than an application form.
  if (!job || !isJobOpen(job)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center max-w-md">
          <AlertCircle className="size-10 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job is no longer available</h2>
          <p className="text-gray-600 mb-6">
            {job
              ? 'This position has closed and is not accepting applications.'
              : 'We could not find this job posting.'}
          </p>
          <Button variant="outline" onClick={onBack}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || ''} ${job.salaryMin || '?'} – ${job.salaryMax || '?'}`.trim()
      : 'Competitive';

  const tags = (job.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

  // Candidate-matching spec §2.3/§3.3: requirements are deliberately public
  // — a candidate is entitled to see what a role requires, only the match
  // itself (step 4) is private. Do not gate this section behind auth or a
  // staff-only read.
  const hasRequirements =
    job.minYearsExperience != null ||
    !!job.minEducation ||
    (job.requiredSkillNames?.length ?? 0) > 0 ||
    job.workAuthorizationRequired;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Back to Jobs
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-semibold mb-2">{job.title}</h1>
          <p className="text-sm text-gray-400 font-mono mb-4">{job.referenceNumber}</p>

          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
            <span className="flex items-center gap-2">
              <Briefcase className="size-5" />
              {job.department || 'General'}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-5" />
              {job.location} {job.remoteType ? `(${job.remoteType})` : ''}
            </span>
            <span className="flex items-center gap-2">
              <DollarSign className="size-5" />
              {salary}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="size-5" />
              {job.jobType}
            </span>
            {job.closingDate && (
              <span className="flex items-center gap-2 text-red-500">
                <Calendar className="size-5" />
                Closes: {job.closingDate}
              </span>
            )}
          </div>

          <Button size="lg" className="px-8" onClick={onApply} style={{ backgroundColor: 'var(--blue-accent)' }}>
            Apply for This Position
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">About the Role</h2>
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }}
            />
          </section>

          {tags.length > 0 && (
            <>
              <div className="border-t border-gray-200" />
              <section>
                <h2 className="text-xl font-semibold mb-4">Skills & Keywords</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}

          {hasRequirements && (
            <>
              <div className="border-t border-gray-200" />
              <section>
                <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-4">
                  {job.minYearsExperience != null && (
                    <span className="flex items-center gap-2">
                      <Briefcase className="size-5" />
                      {job.minYearsExperience}+ years of experience
                    </span>
                  )}
                  {job.minEducation && (
                    <span className="flex items-center gap-2">
                      <GraduationCap className="size-5" />
                      {EDUCATION_LABELS[job.minEducation]} or higher
                    </span>
                  )}
                  {job.workAuthorizationRequired && (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-5" />
                      Work authorisation required
                    </span>
                  )}
                </div>
                {(job.requiredSkillNames?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkillNames!.map((name, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {(job.questions?.length ?? 0) > 0 && (
            <>
              <div className="border-t border-gray-200" />
              <section>
                <h2 className="text-xl font-semibold mb-2">Pre-screening</h2>
                <p className="text-gray-600 text-sm">
                  This application includes {job.questions.length} pre-screening question{job.questions.length > 1 ? 's' : ''}.
                </p>
              </section>
            </>
          )}

          <div className="border-t border-gray-200" />

          <div className="flex justify-center pt-4">
            <Button size="lg" className="px-12" onClick={onApply} style={{ backgroundColor: 'var(--blue-accent)' }}>
              Apply Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
