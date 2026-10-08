import { useState, useEffect, useMemo } from 'react';
import { Plus, Sparkles, Ban, CheckCircle, X, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { SortableHeader } from '../../components/ats/SortableHeader';
import { sortRows, useTableSort, SortColumn } from '../../lib/tableSort';
import { useAuth } from '../../context/AuthContext';
import { Skill, getSkills, createSkill, updateSkill } from '../../services/skillService';
import { getPositions } from '../../services/requisitionService';
import { getJobs } from '../../services/jobService';

const emptyForm = { name: '', department: '' };

type SortKey = 'name' | 'department' | 'status';

const SORT_COLUMNS: Record<SortKey, SortColumn<Skill>> = {
  name: { getValue: (s) => s.name, type: 'string' },
  // No-department skills sort last in both directions, same null-last
  // convention as every other sortable column in the app.
  department: { getValue: (s) => s.department || undefined, type: 'string' },
  status: { getValue: (s) => (s.active ? 'active' : 'inactive'), type: 'string' },
};

type StatusFilter = 'active' | 'inactive' | 'all';

export function SkillsPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  // Canonical department list for the create/edit picker, sourced from
  // Positions and Jobs (row 4's "HR" vs "Human Resources" problem) — kept
  // separate from departmentsInUse below, which is scoped to Skills alone
  // and drives the toolbar filter instead.
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const { sortKey, sortDir, toggleSort } = useTableSort<SortKey>('name', 'asc', ['name', 'department', 'status']);

  const loadSkills = async () => {
    setLoading(true);
    try {
      setSkills(await getSkills());
    } catch (e: any) {
      setError('Failed to load skills: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSkills(); }, []);

  useEffect(() => {
    Promise.all([getPositions(false), getJobs(true)])
      .then(([positions, jobs]) => {
        const departments = new Set<string>();
        for (const p of positions) if (p.department?.trim()) departments.add(p.department.trim());
        for (const j of jobs) if (j.department?.trim()) departments.add(j.department.trim());
        setDepartmentOptions([...departments].sort((a, b) => a.localeCompare(b)));
      })
      .catch((err) => console.error('Failed to load department list', err));
  }, []);

  // Departments actually in use on Skills — drives the toolbar filter, which
  // should only ever offer options that narrow the list to something.
  const departmentsInUse = useMemo(() => {
    const departments = new Set<string>();
    for (const s of skills) if (s.department?.trim()) departments.add(s.department.trim());
    return [...departments].sort((a, b) => a.localeCompare(b));
  }, [skills]);

  const filteredSkills = sortRows(
    skills.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.department || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || s.department === departmentFilter;
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? s.active : !s.active);
      return matchesSearch && matchesDepartment && matchesStatus;
    }),
    SORT_COLUMNS,
    sortKey,
    sortDir
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (skill: Skill) => {
    setEditingId(skill.id);
    setForm({ name: skill.name, department: skill.department || '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !user) return;
    setActionLoading('save');
    setError('');
    try {
      if (editingId) {
        await updateSkill(editingId, { name: form.name, department: form.department }, user);
      } else {
        await createSkill(form, user);
      }
      setIsModalOpen(false);
      setSuccess(editingId ? 'Skill updated.' : 'Skill added.');
      setTimeout(() => setSuccess(''), 3000);
      await loadSkills();
    } catch (e: any) {
      setError('Failed to save skill: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (skill: Skill) => {
    if (!user) return;
    setActionLoading(skill.id);
    try {
      await updateSkill(skill.id, { active: !skill.active }, user);
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, active: !s.active } : s))
      );
    } catch (e: any) {
      setError('Failed to update skill: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Skills</h2>
          <p className="text-gray-500 mt-1">
            The shared skills taxonomy used on candidate profiles and job requirements. A skill in
            use is deactivated, never deleted, so it doesn't vanish from a profile or job that
            already references it.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-autumn-primary hover:bg-autumn-dark text-white shadow-md">
          <Plus className="size-4 mr-2" />
          New Skill
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle className="size-4 shrink-0" /> {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search skills..."
            className="flex-1 min-w-[200px] md:w-72 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary text-gray-700"
          >
            <option value="all">All departments</option>
            {departmentsInUse.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary text-gray-700"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <SortableHeader label="Skill" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Department" sortKey="department" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="size-8 animate-spin text-gray-300 mx-auto" /></td></tr>
              ) : filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => (
                  <tr
                    key={skill.id}
                    className={`hover:bg-gray-50/50 transition-colors group ${skill.active ? '' : 'opacity-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{skill.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{skill.department || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={skill.active ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(skill)}
                          className="p-2 rounded-lg text-gray-400 hover:text-autumn-primary hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(skill)}
                          disabled={actionLoading === skill.id}
                          className={`p-2 rounded-lg transition-colors ${skill.active
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={skill.active ? 'Deactivate' : 'Activate'}
                        >
                          {actionLoading === skill.id
                            ? <Loader2 className="size-4 animate-spin" />
                            : skill.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Sparkles className="size-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No skills yet</p>
                      <p className="text-sm">Add skills so candidates and job requirements can reference the same taxonomy.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Skill' : 'New Skill'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />{error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  placeholder="e.g. JavaScript"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department scope (optional)</label>
                <input
                  type="text"
                  list="skill-department-options"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  placeholder="e.g. Engineering"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
                {/* Suggests the departments already used by Positions and Jobs so this
                    doesn't drift into "HR" vs "Human Resources" duplicates — free text
                    is still accepted for a genuinely new department. */}
                <datalist id="skill-department-options">
                  {departmentOptions.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || actionLoading === 'save'}
                className="bg-autumn-primary hover:bg-autumn-dark text-white"
              >
                {actionLoading === 'save' ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {editingId ? 'Save Changes' : 'Add Skill'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
