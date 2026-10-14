import { SkillPicker } from '../ats/SkillPicker';
import { EDUCATION_LEVELS, EDUCATION_LABELS, EducationLevel } from '../../lib/education';
import { Skill } from '../../services/skillService';

interface CapabilityProfileSectionProps {
  allSkills: Skill[];
  skillIds: string[];
  setSkillIds: (ids: string[]) => void;
  yearsOfExperience: string;
  setYearsOfExperience: (v: string) => void;
  highestEducation: EducationLevel | '';
  setHighestEducation: (v: EducationLevel | '') => void;
}

/**
 * Candidate-matching spec §2.2 capability profile. Gated out of
 * CandidateDashboard.tsx entirely by MATCHING_ENABLED (src/config/features.ts)
 * — lazy-imported so the fields (and the SkillPicker/Skills-taxonomy fetch
 * they need) never ship to a candidate while the feature is parked.
 */
export function CapabilityProfileSection({
  allSkills,
  skillIds,
  setSkillIds,
  yearsOfExperience,
  setYearsOfExperience,
  highestEducation,
  setHighestEducation,
}: CapabilityProfileSectionProps) {
  return (
    <div className="border-t border-border pt-8">
      <h3 className="text-lg font-bold text-autumn-charcoal mb-1">Capability Profile</h3>
      <p className="text-sm text-gray-500 mb-4">
        Filled once, reused across every application — this is what helps us match you
        to the right roles.
      </p>
      {skillIds.length === 0 && !yearsOfExperience && !highestEducation && (
        <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 mb-4 text-sm text-autumn-charcoal">
          You haven't added your skills, experience or education yet — complete this
          section so recruiters can see how your background fits a role's requirements.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="text-sm text-gray-500 block mb-1">Skills</label>
          <SkillPicker
            allSkills={allSkills}
            selectedIds={skillIds}
            onChange={setSkillIds}
            showInactiveLabel={false}
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">Years of Experience</label>
          <input
            type="number"
            min={0}
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            className="w-full p-2 border border-border rounded-lg"
            placeholder="e.g. 4"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">Highest Education</label>
          <select
            value={highestEducation}
            onChange={(e) => setHighestEducation(e.target.value as EducationLevel | '')}
            className="w-full p-2 border border-border rounded-lg bg-white"
          >
            <option value="">Select…</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{EDUCATION_LABELS[level]}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
