import { AlertTriangle } from 'lucide-react';
import { SkillPicker } from '../ats/SkillPicker';
import { EDUCATION_LEVELS, EDUCATION_LABELS, EducationLevel } from '../../lib/education';
import { Skill } from '../../services/skillService';

interface JobRequirementsEditorProps {
  minYearsExperience: string;
  minEducation: EducationLevel | '';
  requiredSkillIds: string[];
  workAuthorizationRequired: boolean;
  allSkills: Skill[];
  hasWorkAuthQuestion: boolean;
  onChangeMinYearsExperience: (v: string) => void;
  onChangeMinEducation: (v: EducationLevel | '') => void;
  onChangeRequiredSkillIds: (ids: string[]) => void;
  onChangeWorkAuthorizationRequired: (v: boolean) => void;
}

/**
 * Candidate-matching spec §2.3 job requirements. Gated out of CreateJob.tsx
 * entirely by MATCHING_ENABLED (src/config/features.ts) — lazy-imported so
 * the SkillPicker/Skills-taxonomy code never ships while the feature is
 * parked.
 */
export function JobRequirementsEditor({
  minYearsExperience,
  minEducation,
  requiredSkillIds,
  workAuthorizationRequired,
  allSkills,
  hasWorkAuthQuestion,
  onChangeMinYearsExperience,
  onChangeMinEducation,
  onChangeRequiredSkillIds,
  onChangeWorkAuthorizationRequired,
}: JobRequirementsEditorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 transition-shadow hover:shadow-md">
      <h2 className="text-xl font-bold text-gray-900 mb-2 pb-4 border-b border-gray-100">
        Candidate Requirements
      </h2>
      <p className="text-gray-500 mb-6">
        Optional. Published on the advert — a candidate is entitled to see what a role
        requires. These feed the match score shown to recruiters in Step 4; they never
        block an application.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum years of experience
          </label>
          <input
            type="number"
            min={0}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
            placeholder="e.g. 3"
            value={minYearsExperience}
            onChange={(e) => onChangeMinYearsExperience(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum education
          </label>
          <select
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] outline-none transition-all"
            value={minEducation}
            onChange={(e) => onChangeMinEducation(e.target.value as EducationLevel | '')}
          >
            <option value="">No minimum</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{EDUCATION_LABELS[level]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Required skills
        </label>
        <SkillPicker
          allSkills={allSkills}
          selectedIds={requiredSkillIds}
          onChange={onChangeRequiredSkillIds}
          placeholder="Add a required skill…"
        />
      </div>
      <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100 transition-colors hover:bg-blue-50">
        <input
          type="checkbox"
          id="workAuthRequired"
          className="w-4 h-4 text-[var(--pumpkin-orange)] rounded border-gray-300 focus:ring-[var(--pumpkin-orange)]"
          checked={workAuthorizationRequired}
          onChange={(e) => onChangeWorkAuthorizationRequired(e.target.checked)}
        />
        <label htmlFor="workAuthRequired" className="text-sm text-gray-700 cursor-pointer select-none w-full">
          <span className="font-semibold block text-gray-900">Work authorisation required</span>
          <span className="text-gray-500">
            An unmet requirement flags the candidate for a recruiter to review — it never
            removes them from the longlist.
          </span>
        </label>
      </div>
      {workAuthorizationRequired && !hasWorkAuthQuestion && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            Work authorisation is required, but no screening question is linked to it yet
            (Step 3 — set a question's "Links to requirement" to Work Authorisation).
            Without that link, every candidate comes back unassessed on this criterion.
          </span>
        </div>
      )}
    </div>
  );
}
