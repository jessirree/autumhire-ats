import { useEffect, useMemo, useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { SortableHeader } from '../../components/ats/SortableHeader';
import { sortRows, useTableSort, SortColumn } from '../../lib/tableSort';
import { downloadCsv } from '../../lib/exportCsv';
import { computeMatch, MatchResult } from '../../lib/matching';
import { Job } from '../../services/jobService';
import { Application } from '../../services/applicationService';
import { CandidateProfile, getCandidateProfile } from '../../services/profileService';

/**
 * Requirement row 5.8: best-match profiles, required vs existing
 * competencies, one job at a time — ranking the whole candidate pool
 * against a job (not just its applicants) is the more valuable version
 * and would make the Candidates page earn its place, but it changes the
 * read volume from "applicants to this job" to "every candidate on file",
 * which the traceability pass already flags as a scale risk (row 4.1).
 * Deliberately NOT built here.
 *
 * Reuses src/lib/matching.ts for scoring, src/lib/tableSort.ts for
 * ranking, src/lib/exportCsv.ts for the export — no second sorting or
 * scoring path.
 */

interface BestMatchReportProps {
  jobs: Job[];
  /** All applications (ReportsPage already loads these) — filtered here by the selected job, so this needs no Firestore read of its own beyond the per-candidate profiles. */
  applications: Application[];
}

interface RankedApplicant {
  application: Application;
  match: MatchResult;
}

type SortKey = 'candidateName' | 'matchScore' | 'experience' | 'education' | 'skills' | 'workAuth';

function criterion(match: MatchResult, key: 'experience' | 'education' | 'skills') {
  return match.gradientCriteria.find((c) => c.key === key)!;
}

export function BestMatchReport({ jobs, applications }: BestMatchReportProps) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [profilesByCandidateId, setProfilesByCandidateId] = useState<Record<string, CandidateProfile>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const { sortKey, sortDir, toggleSort } = useTableSort<SortKey>('matchScore', 'desc', ['candidateName']);

  // Jobs with at least one applicant — a job nobody applied to has nothing
  // to rank, same idiom as the Excel export selector above.
  const jobsWithApplications = useMemo(() => {
    const idsWithApps = new Set(applications.map((a) => a.jobId));
    return jobs.filter((j) => idsWithApps.has(j.id));
  }, [jobs, applications]);

  useEffect(() => {
    if (!selectedJobId && jobsWithApplications.length > 0) {
      setSelectedJobId(jobsWithApplications[0].id);
    }
  }, [selectedJobId, jobsWithApplications]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const applicants = useMemo(
    () => applications.filter((a) => a.jobId === selectedJobId),
    [applications, selectedJobId]
  );

  useEffect(() => {
    if (applicants.length === 0) {
      setProfilesByCandidateId({});
      return;
    }
    setLoadingProfiles(true);
    const uniqueCandidateIds = [...new Set(applicants.map((a) => a.candidateId))];
    Promise.all(uniqueCandidateIds.map((id) => getCandidateProfile(id)))
      .then((profiles) => {
        setProfilesByCandidateId(Object.fromEntries(uniqueCandidateIds.map((id, i) => [id, profiles[i]])));
      })
      .catch((err) => console.error('Failed to load candidate profiles', err))
      .finally(() => setLoadingProfiles(false));
  }, [applicants]);

  // First null case: a job with no requirements at all cannot be reported
  // on — there is nothing to rank anyone against. Said plainly below,
  // instead of rendering an empty table or a list of zeroes.
  const jobHasRequirements =
    !!selectedJob &&
    (selectedJob.minYearsExperience != null ||
      !!selectedJob.minEducation ||
      (selectedJob.requiredSkillIds?.length ?? 0) > 0 ||
      !!selectedJob.workAuthorizationRequired);

  const results: RankedApplicant[] = useMemo(() => {
    if (!selectedJob) return [];
    return applicants.map((application) => ({
      application,
      match: computeMatch(
        {
          minYearsExperience: selectedJob.minYearsExperience,
          minEducation: selectedJob.minEducation,
          requiredSkillIds: selectedJob.requiredSkillIds,
          workAuthorizationRequired: selectedJob.workAuthorizationRequired,
        },
        profilesByCandidateId[application.candidateId] ?? {},
        selectedJob.questions ?? [],
        application.answers ?? []
      ),
    }));
  }, [applicants, selectedJob, profilesByCandidateId]);

  // Second null case: a candidate with nothing in their capability profile
  // is UNRANKED, not last. Deliberately a separate section below the
  // ranked table, not a row sorted to the bottom of it — null already
  // sorts last in sortRows, but even clearly labeled, a row at the bottom
  // of a ranked ladder still reads as "the worst one". A structurally
  // separate section makes "we don't know" visibly different from "we
  // know, and it's low", which is the whole point of the null case.
  const ranked = results.filter((r) => r.match.score != null);
  const unranked = results.filter((r) => r.match.score == null);

  const SORT_COLUMNS: Record<SortKey, SortColumn<RankedApplicant>> = useMemo(
    () => ({
      candidateName: { getValue: (r) => r.application.candidateName, type: 'string' },
      matchScore: { getValue: (r) => r.match.score ?? undefined },
      experience: { getValue: (r) => criterion(r.match, 'experience').subScore ?? undefined },
      education: { getValue: (r) => criterion(r.match, 'education').subScore ?? undefined },
      skills: { getValue: (r) => criterion(r.match, 'skills').subScore ?? undefined },
      workAuth: {
        getValue: (r) =>
          r.match.hardCriterion.status === 'unmet' ? 1 : r.match.hardCriterion.status === 'met' ? 0 : undefined,
      },
    }),
    []
  );

  const sortedRanked = sortRows(ranked, SORT_COLUMNS, sortKey, sortDir);

  const handleExport = () => {
    if (!selectedJob) return;
    const headers = [
      'Candidate', 'Email', 'Match Score',
      'Experience Required', 'Experience Existing',
      'Education Required', 'Education Existing',
      'Skills Required', 'Skills Existing',
      'Work Authorisation',
    ];
    const rowFor = (r: RankedApplicant) => {
      const exp = criterion(r.match, 'experience');
      const edu = criterion(r.match, 'education');
      const skl = criterion(r.match, 'skills');
      return [
        r.application.candidateName,
        r.application.email,
        r.match.score ?? 'Not assessed',
        exp.required, exp.existing,
        edu.required, edu.existing,
        skl.required, skl.existing,
        r.match.hardCriterion.status,
      ];
    };
    const rows = [...sortedRanked, ...unranked].map(rowFor);
    downloadCsv(
      `best-match-${selectedJob.referenceNumber}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h3 className="font-semibold">Best-Match Report</h3>
          <p className="text-sm text-gray-500">
            Row 5.8 — applicants for one job, ranked by fit against its requirements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
          >
            {jobsWithApplications.length === 0 && <option value="">No jobs with applicants yet</option>}
            {jobsWithApplications.map((j) => (
              <option key={j.id} value={j.id}>{j.title} ({j.referenceNumber})</option>
            ))}
          </select>
          <Button variant="outline" disabled={!selectedJob || results.length === 0} onClick={handleExport}>
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {!selectedJob ? (
        <p className="text-sm text-gray-500">No jobs with applicants yet.</p>
      ) : loadingProfiles ? (
        <p className="text-sm text-gray-500">Loading applicants…</p>
      ) : !jobHasRequirements ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            This job has no requirements set (the Candidate Requirements section in the job builder).
            There is nothing to rank applicants against, so this report can't be produced for it yet —
            not an empty table, there is genuinely no basis for one.
          </span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableHeader label="Candidate" sortKey="candidateName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Match Score" sortKey="matchScore" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Experience" sortKey="experience" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Education" sortKey="education" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Skills" sortKey="skills" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Work Auth" sortKey="workAuth" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRanked.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      No applicants have enough profile data to be ranked yet.
                    </td>
                  </tr>
                ) : (
                  sortedRanked.map(({ application, match }) => {
                    const exp = criterion(match, 'experience');
                    const edu = criterion(match, 'education');
                    const skl = criterion(match, 'skills');
                    return (
                      <tr key={application.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{application.candidateName}</div>
                          <div className="text-xs text-gray-500">{application.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">{match.score}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {exp.assessed
                            ? <span className="font-semibold text-gray-800">{exp.subScore}/100</span>
                            : <span className="italic text-gray-400">Not assessed</span>}
                          <div className="text-gray-400 mt-0.5">Req: {exp.required} · Has: {exp.existing}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {edu.assessed
                            ? <span className="font-semibold text-gray-800">{edu.subScore}/100</span>
                            : <span className="italic text-gray-400">Not assessed</span>}
                          <div className="text-gray-400 mt-0.5">Req: {edu.required} · Has: {edu.existing}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {skl.assessed
                            ? <span className="font-semibold text-gray-800">{skl.subScore}/100</span>
                            : <span className="italic text-gray-400">Not assessed</span>}
                          <div className="text-gray-400 mt-0.5">Req: {skl.required} · Has: {skl.existing}</div>
                        </td>
                        <td className="px-4 py-3">
                          {match.hardCriterion.status === 'unmet' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              Flagged
                            </span>
                          ) : match.hardCriterion.status === 'met' ? (
                            <span className="text-xs text-green-600">OK</span>
                          ) : match.hardCriterion.status === 'not-assessed' ? (
                            <span className="text-xs text-gray-400 italic">Not assessed</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {unranked.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Unranked — no capability profile data ({unranked.length})
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Not last, not excluded — nothing in their profile overlaps with what this job asks for yet.
                They remain on the longlist exactly as before.
              </p>
              <div className="space-y-2">
                {unranked.map(({ application }) => (
                  <div key={application.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{application.candidateName}</span>
                    <span className="text-xs text-gray-400">{application.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
