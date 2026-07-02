import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Briefcase, Clock, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Job, getJobById, isJobOpen } from '../../services/jobService';

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
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
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
