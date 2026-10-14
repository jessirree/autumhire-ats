/**
 * job.tags is free-text keywords, not a requirement — this used to render
 * under a heading called "Requirements" (JobBoard) or "Skills & Keywords"
 * (JobDetail/the builder's own preview), both actively wrong now that real
 * requirements and real required skills existed. The structured-requirements
 * sibling this file used to export (JobRequirementsSection,
 * hasPublishedRequirements) was removed by client decision 2026-10-15 — the
 * client asked for requirements to live in the job description prose
 * instead of a highlighted list, independent of the candidate-matching gate
 * (see src/config/features.ts). This one stays: tags/keywords is a separate,
 * pre-existing feature, not part of candidate matching.
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
