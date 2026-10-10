import { Briefcase, GraduationCap, ShieldCheck } from 'lucide-react';
import { EDUCATION_LABELS } from '../../lib/education';
import type { Job } from '../../services/jobService';

type PublishedRequirements = Pick<
  Job,
  'minYearsExperience' | 'minEducation' | 'requiredSkillNames' | 'workAuthorizationRequired'
>;

export function hasPublishedRequirements(job: PublishedRequirements): boolean {
  return (
    job.minYearsExperience != null ||
    !!job.minEducation ||
    (job.requiredSkillNames?.length ?? 0) > 0 ||
    !!job.workAuthorizationRequired
  );
}

/**
 * Candidate-matching spec §2.3/§3.3: requirements are deliberately public —
 * a candidate is entitled to see what a role requires, only the match
 * itself is private. Shared by every candidate-facing (and preview) surface
 * that shows a job, so "requirements" doesn't drift into three slightly
 * different renderings.
 *
 * Reads requiredSkillNames, NEVER a live Skills lookup — an anonymous
 * career-site visitor can't read the Skills collection (isActive()), so a
 * live lookup renders empty when signed out. requiredSkillNames is the
 * denormalized snapshot that exists precisely to avoid that.
 *
 * Visually distinct from a tags/keywords list on purpose (see
 * JobKeywordsSection below) — colored icon chips and filled pills, not a
 * second identical-looking list.
 */
export function JobRequirementsSection({ job }: { job: PublishedRequirements }) {
  if (!hasPublishedRequirements(job)) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Requirements</h2>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
        {job.minYearsExperience != null && (
          <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
            <Briefcase className="size-4 text-[var(--pumpkin-orange)]" />
            {job.minYearsExperience}+ years of experience
          </span>
        )}
        {job.minEducation && (
          <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
            <GraduationCap className="size-4 text-[var(--pumpkin-orange)]" />
            {EDUCATION_LABELS[job.minEducation]} or higher
          </span>
        )}
        {job.workAuthorizationRequired && (
          <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="size-4 text-[var(--pumpkin-orange)]" />
            Work authorisation required
          </span>
        )}
      </div>
      {(job.requiredSkillNames?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {job.requiredSkillNames!.map((name, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-orange-50 text-[var(--pumpkin-orange)] border border-orange-200 rounded-full text-sm font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * job.tags is free-text keywords, not a requirement — this used to render
 * under a heading called "Requirements" (JobBoard) or "Skills & Keywords"
 * (JobDetail/the builder's own preview), both actively wrong now that real
 * requirements and real required skills exist. Deliberately a different
 * visual language from JobRequirementsSection (muted outline chips, a small
 * uppercase label) so the two never look like two copies of the same list.
 */
export function JobKeywordsSection({ tags }: { tags?: string }) {
  const keywords = (tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  if (keywords.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Keywords</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((tag, index) => (
          <span key={index} className="px-2.5 py-1 border border-gray-200 rounded text-xs text-gray-500">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
