import { useState, useEffect, useMemo } from 'react';
import { Plus, Briefcase, Ban, CheckCircle, X, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Position, getPositions, createPosition, updatePosition } from '../../services/requisitionService';

const emptyForm = { title: '', department: '', gradeHint: '', description: '' };

export function PositionsPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadPositions = async () => {
    setLoading(true);
    try {
      setPositions(await getPositions(false));
    } catch (e: any) {
      setError('Failed to load positions: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPositions(); }, []);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [positions, searchTerm]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (position: Position) => {
    setEditingId(position.id);
    setForm({
      title: position.title,
      department: position.department,
      gradeHint: position.gradeHint || '',
      description: position.description || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.department || !user) return;
    setActionLoading('save');
    setError('');
    try {
      if (editingId) {
        await updatePosition(editingId, form);
      } else {
        await createPosition(form, user.id);
      }
      setIsModalOpen(false);
      setSuccess(editingId ? 'Position updated.' : 'Position created.');
      setTimeout(() => setSuccess(''), 3000);
      await loadPositions();
    } catch (e: any) {
      setError('Failed to save position: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (position: Position) => {
    setActionLoading(position.id);
    try {
      await updatePosition(position.id, { isActive: !position.isActive });
      setPositions((prev) =>
        prev.map((p) => (p.id === position.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (e: any) {
      setError('Failed to update position: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Positions</h2>
          <p className="text-gray-500 mt-1">Pre-load and manage the catalog of positions requisitions can be raised against.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-autumn-primary hover:bg-autumn-dark text-white shadow-md">
          <Plus className="size-4 mr-2" />
          New Position
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
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search positions..."
            className="w-full md:w-72 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                {['Position', 'Department', 'Grade', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="size-8 animate-spin text-gray-300 mx-auto" /></td></tr>
              ) : filteredPositions.length > 0 ? (
                filteredPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{position.title}</div>
                      {position.description && <div className="text-sm text-gray-500 max-w-xs truncate">{position.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{position.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{position.gradeHint || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={position.isActive ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(position)}
                          className="p-2 rounded-lg text-gray-400 hover:text-autumn-primary hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(position)}
                          disabled={actionLoading === position.id}
                          className={`p-2 rounded-lg transition-colors ${position.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={position.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {actionLoading === position.id
                            ? <Loader2 className="size-4 animate-spin" />
                            : position.isActive ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Briefcase className="size-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No positions yet</p>
                      <p className="text-sm">Create a position so recruiters can raise requisitions against it.</p>
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
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Position' : 'New Position'}</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  placeholder="e.g. Software Engineer"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  placeholder="e.g. Engineering"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  placeholder="e.g. Grade 7"
                  value={form.gradeHint}
                  onChange={(e) => setForm({ ...form, gradeHint: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!form.title || !form.department || actionLoading === 'save'}
                className="bg-autumn-primary hover:bg-autumn-dark text-white"
              >
                {actionLoading === 'save' ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {editingId ? 'Save Changes' : 'Create Position'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
