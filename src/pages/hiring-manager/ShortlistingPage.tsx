import { useEffect, useState } from 'react';
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Eye,
    Search,
    Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
    Application,
    getAllApplications,
    updateApplicationStatus,
    addPanelComment,
} from '../../services/applicationService';

interface Candidate {
    id: string;
    name: string;
    role: string;
    score: number;
    status: string;
    appliedDate: string;
    note?: string;
    application: Application;
}

interface ShortlistingPageProps {
    onViewCandidate: (candidateId: string) => void;
}

export function ShortlistingPage({ onViewCandidate }: ShortlistingPageProps) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [noteText, setNoteText] = useState('');
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        getAllApplications()
            .then((apps) =>
                setCandidates(
                    apps
                        // Hiring managers review the longlist + already shortlisted candidates.
                        .filter((a) => ['longlisted', 'shortlisted', 'rejected'].includes(a.status))
                        .map((a) => ({
                            id: a.id,
                            name: a.candidateName,
                            role: a.jobTitle,
                            score: a.prescreenScore,
                            status: a.status,
                            appliedDate: a.appliedAt?.toDate ? a.appliedAt.toDate().toLocaleDateString() : '—',
                            application: a,
                        }))
                )
            )
            .catch((err) => console.error('Failed to load candidates', err))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleStatusChange = async (candidate: Candidate, newStatus: 'shortlisted' | 'rejected') => {
        if (!user) return;
        // Provision for rationale supporting the shortlisting decision.
        const rationale = prompt(
            newStatus === 'shortlisted'
                ? `Rationale for shortlisting ${candidate.name} (optional):`
                : `Rationale for rejecting ${candidate.name} (optional):`
        ) || undefined;
        try {
            await updateApplicationStatus(candidate.application, newStatus, user, rationale, newStatus === 'rejected');
            load();
        } catch (err: any) {
            alert(err?.message || 'Failed to update status.');
        }
    };

    const handleAddNote = async (id: string) => {
        if (activeNoteId === id) {
            if (user && noteText.trim()) {
                await addPanelComment(id, user, noteText.trim(), 'shortlisting');
                setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, note: noteText.trim() } : c)));
            }
            setActiveNoteId(null);
            setNoteText('');
        } else {
            const candidate = candidates.find((c) => c.id === id);
            setNoteText(candidate?.note || '');
            setActiveNoteId(id);
        }
    };

    const visibleCandidates = candidates.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );



    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Candidate Shortlisting</h1>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-autumn-orange/50"
                        />
                    </div>
                    <Button variant="outline" className="flex items-center gap-2">
                        <Filter className="size-4" /> Filter
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading candidates…</td></tr>
                            )}
                            {!loading && visibleCandidates.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No longlisted candidates yet. Candidates appear here once the recruiter long-lists them.</td></tr>
                            )}
                            {!loading && visibleCandidates.map((candidate) => (
                                <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600">
                                                {candidate.name.charAt(0)}
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() => onViewCandidate(candidate.id)}
                                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left"
                                                >
                                                    {candidate.name}
                                                </button>
                                                <div className="text-xs text-gray-500">Applied {candidate.appliedDate}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{candidate.role}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${candidate.score >= 90 ? 'bg-green-100 text-green-800' :
                                                candidate.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'}`}>
                                            {candidate.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{[candidate.application.city, candidate.application.country].filter(Boolean).join(', ') || '—'}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={candidate.status} size="sm" />
                                    </td>
                                    <td className="px-6 py-4">
                                        {activeNoteId === candidate.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-autumn-orange"
                                                    placeholder="Add note..."
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddNote(candidate.id);
                                                    }}
                                                />
                                                <button onClick={() => handleAddNote(candidate.id)} className="text-green-600 hover:text-green-700">
                                                    <CheckCircle className="size-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1 group"
                                                onClick={() => handleAddNote(candidate.id)}
                                            >
                                                <MessageSquare className="size-3" />
                                                <span className="truncate max-w-[150px]">{candidate.note || 'Add note...'}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-xs text-autumn-orange ml-1">Edit</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-500 hover:text-blue-600"
                                                title="View Profile"
                                                onClick={() => onViewCandidate(candidate.id)}
                                            >
                                                <Eye className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-500 hover:bg-green-600 text-white border-none h-8 w-8 p-0 rounded-full"
                                                title="Shortlist"
                                                onClick={() => handleStatusChange(candidate, 'shortlisted')}
                                            >
                                                <CheckCircle className="size-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-red-500 hover:bg-red-600 text-white border-none h-8 w-8 p-0 rounded-full"
                                                title="Reject"
                                                onClick={() => handleStatusChange(candidate, 'rejected')}
                                            >
                                                <XCircle className="size-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing {visibleCandidates.length} candidates
                </div>
            </div>

            {/* Resume Preview Modal */}

        </div>
    );
}

