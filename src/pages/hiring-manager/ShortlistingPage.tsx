import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Eye,
    Search,
    Info,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { promptText } from '../../components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { DutyBanner } from '../../components/ats/DutyBanner';
import { SortableHeader, SortIndicator } from '../../components/ats/SortableHeader';
import { sortRows, useTableSort, SortColumn } from '../../lib/tableSort';
import { useAuth } from '../../context/AuthContext';
import {
    Application,
    PanelRating,
    PanelRatingScore,
    RATING_LABELS,
    getAllApplications,
    updateApplicationStatus,
    addPanelComment,
    setPanelRating,
    clearPanelRating,
    getPanelRatings,
    getPanelRatingsForApplications,
} from '../../services/applicationService';
import { getJobs } from '../../services/jobService';

interface Candidate {
    id: string;
    name: string;
    role: string;
    score: number;
    status: string;
    appliedDate: string;
    appliedAtMs: number | null;
    panelRatingAvg: number | null;
    note?: string;
    application: Application;
}

type SortKey = 'candidateName' | 'prescreenScore' | 'appliedAt' | 'rating';

const SORT_COLUMNS: Record<SortKey, SortColumn<Candidate>> = {
    candidateName: { getValue: (c) => c.name, type: 'string' },
    prescreenScore: { getValue: (c) => c.score },
    rating: { getValue: (c) => c.panelRatingAvg },
    appliedAt: { getValue: (c) => c.appliedAtMs },
};

function ratingColorClass(avg: number): string {
    if (avg < 1.7) return 'text-autumn-red';
    if (avg <= 2.3) return 'text-autumn-yellow';
    return 'text-autumn-green';
}

interface PanelRatingCellProps {
    ratings: PanelRating[];
    myId: string | undefined;
    onRate: (score: PanelRatingScore) => void;
    onClear: () => void;
    onComment: () => void;
}

// Panel isolation (brief section 5): before this panelist has rated, show
// only a neutral count — no average, no names, no scores. After they rate,
// show the average, the count, and the per-panelist breakdown with names.
function PanelRatingCell({ ratings, myId, onRate, onClear, onComment }: PanelRatingCellProps) {
    const [editing, setEditing] = useState(false);
    const mine = ratings.find((r) => r.panelistId === myId);
    const showButtons = !mine || editing;

    if (showButtons) {
        return (
            <div className="flex items-center gap-1.5">
                {([1, 2, 3] as PanelRatingScore[]).map((score) => (
                    <Tooltip key={score}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => { onRate(score); setEditing(false); }}
                                className={`size-7 rounded-full border text-xs font-bold flex items-center justify-center transition-colors ${
                                    mine?.score === score
                                        ? 'bg-autumn-primary text-white border-autumn-primary'
                                        : 'border-gray-200 text-gray-600 hover:border-autumn-primary hover:text-autumn-primary'
                                }`}
                            >
                                {score}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{RATING_LABELS[score]}</TooltipContent>
                    </Tooltip>
                ))}
                <button
                    type="button"
                    title="Add an optional comment"
                    className="text-gray-400 hover:text-autumn-orange"
                    onClick={onComment}
                >
                    <MessageSquare className="size-3.5" />
                </button>
                {mine ? (
                    <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-red-500 ml-1"
                        onClick={() => { onClear(); setEditing(false); }}
                    >
                        Clear
                    </button>
                ) : (
                    <span className="text-xs text-gray-400 ml-1">
                        {ratings.length === 0 ? 'No ratings yet' : `${ratings.length} rated`}
                    </span>
                )}
            </div>
        );
    }

    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    return (
        <div className="group relative inline-block">
            <button type="button" onClick={() => setEditing(true)} className="text-left">
                <span className={`text-base font-bold ${ratingColorClass(avg)}`}>{avg.toFixed(1)}</span>
                <span className="block text-xs text-muted-foreground">
                    from {ratings.length} · you rated {mine!.score}
                    {mine!.comment && <MessageSquare className="size-3 inline ml-1 -mt-0.5 text-autumn-orange" />}
                </span>
            </button>
            <div className="hidden group-hover:block absolute z-10 left-0 top-full mt-1 w-max max-w-xs bg-white border border-gray-200 rounded-lg shadow-md p-2 text-xs text-gray-600 whitespace-normal space-y-1.5">
                {ratings.map((r) => (
                    <div key={r.panelistId}>
                        <span className="font-medium">{r.panelistName}</span>: {RATING_LABELS[r.score]}
                        {r.comment && (
                            <div className="text-muted-foreground italic">{r.comment}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ShortlistingPageProps {
    onViewCandidate: (candidateId: string) => void;
}

export function ShortlistingPage({ onViewCandidate }: ShortlistingPageProps) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [noteText, setNoteText] = useState('');
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [criteriaByJobId, setCriteriaByJobId] = useState<Record<string, string>>({});
    const [openCriteriaId, setOpenCriteriaId] = useState<string | null>(null);
    const { sortKey, sortDir, toggleSort } = useTableSort<SortKey>('appliedAt', 'desc', ['candidateName']);
    const [statusFilter, setStatusFilter] = useState('');
    const [ratingsByAppId, setRatingsByAppId] = useState<Record<string, PanelRating[]>>({});

    const load = () => {
        setLoading(true);
        setError(null);
        Promise.all([getAllApplications(), getJobs(true)])
            .then(async ([apps, jobs]) => {
                // Hiring managers review the longlist + already shortlisted candidates.
                const relevant = apps.filter((a) => ['longlisted', 'shortlisted', 'rejected'].includes(a.status));
                setCandidates(
                    relevant.map((a) => ({
                        id: a.id,
                        name: a.candidateName,
                        role: a.jobTitle,
                        score: a.prescreenScore,
                        status: a.status,
                        appliedDate: a.appliedAt?.toDate ? a.appliedAt.toDate().toLocaleDateString() : '—',
                        appliedAtMs: a.appliedAt?.toMillis?.() ?? null,
                        panelRatingAvg: a.panelRatingAvg ?? null,
                        application: a,
                    }))
                );
                const map: Record<string, string> = {};
                for (const job of jobs) {
                    if (job.shortlistingCriteria?.trim()) map[job.id] = job.shortlistingCriteria;
                }
                setCriteriaByJobId(map);
                // Loaded once for the whole visible list rather than per row.
                setRatingsByAppId(await getPanelRatingsForApplications(relevant.map((a) => a.id)));
            })
            .catch((err: any) => {
                console.error('Failed to load candidates', err);
                setError(err?.message || 'Failed to load candidates.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const refreshRatings = async (applicationId: string) => {
        setRatingsByAppId((prev) => ({ ...prev, [applicationId]: [] }));
        const ratings = await getPanelRatings(applicationId);
        setRatingsByAppId((prev) => ({ ...prev, [applicationId]: ratings }));
    };

    const handleRate = async (applicationId: string, score: PanelRatingScore) => {
        if (!user) return;
        try {
            const { avg } = await setPanelRating(applicationId, user, score);
            await refreshRatings(applicationId);
            setCandidates((prev) =>
                prev.map((c) => (c.id === applicationId ? { ...c, panelRatingAvg: avg } : c))
            );
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save your rating.');
        }
    };

    const handleClearRating = async (applicationId: string) => {
        if (!user) return;
        try {
            const { avg } = await clearPanelRating(applicationId, user);
            await refreshRatings(applicationId);
            setCandidates((prev) =>
                prev.map((c) => (c.id === applicationId ? { ...c, panelRatingAvg: avg } : c))
            );
        } catch (err: any) {
            toast.error(err?.message || 'Failed to clear your rating.');
        }
    };

    const handleRatingComment = async (applicationId: string) => {
        if (!user) return;
        const mine = ratingsByAppId[applicationId]?.find((r) => r.panelistId === user.id);
        if (!mine) {
            toast.error('Choose a rating (1, 2 or 3) first, then add a comment.');
            return;
        }
        const comment = await promptText({
            title: 'Optional comment on your rating (visible to the panel):',
            defaultValue: mine.comment || '',
        });
        if (comment === null) return; // cancelled
        try {
            await setPanelRating(applicationId, user, mine.score, comment || undefined);
            await refreshRatings(applicationId);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save your comment.');
        }
    };

    const handleStatusChange = async (candidate: Candidate, newStatus: 'shortlisted' | 'rejected') => {
        if (!user) return;
        // Provision for rationale supporting the shortlisting decision.
        const rationale = await promptText({
            title: newStatus === 'shortlisted'
                ? `Rationale for shortlisting ${candidate.name} (optional):`
                : `Rationale for rejecting ${candidate.name} (optional):`
        }) || undefined;
        try {
            await updateApplicationStatus(candidate.application, newStatus, user, rationale, newStatus === 'rejected');
            load();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update status.');
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

    const visibleCandidates = sortRows(
        candidates.filter(
            (c) =>
                (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.role.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (!statusFilter || c.status === statusFilter)
        ),
        SORT_COLUMNS,
        sortKey,
        sortDir
    );



    return (
        <TooltipProvider delayDuration={200}>
        <div className="p-8 h-full flex flex-col">
            <DutyBanner>
                Your duty here: review the recruiter's longlist, apply the job's shortlisting criteria (see the
                info icon next to each role), and shortlist or reject candidates with a documented rationale.
            </DutyBanner>
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
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-autumn-orange/50"
                    >
                        <option value="">All Stages</option>
                        <option value="longlisted">Longlisted</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <SortableHeader label="Candidate" sortKey="candidateName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <SortableHeader label="Score" sortKey="prescreenScore" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Panel Rating" sortKey="rating" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading candidates…</td></tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <p className="text-red-600 font-medium mb-3">{error}</p>
                                        <Button variant="outline" size="sm" onClick={load}>Retry</Button>
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && visibleCandidates.length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">No longlisted candidates yet. Candidates appear here once the recruiter long-lists them.</td></tr>
                            )}
                            {!loading && !error && visibleCandidates.map((candidate) => (
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
                                                <button
                                                    type="button"
                                                    className="text-xs text-gray-500 hover:text-gray-700"
                                                    title="Sort by date applied"
                                                    onClick={() => toggleSort('appliedAt')}
                                                >
                                                    Applied {candidate.appliedDate}
                                                    <SortIndicator active={sortKey === 'appliedAt'} dir={sortDir} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            {candidate.role}
                                            {criteriaByJobId[candidate.application.jobId] && (
                                                <button
                                                    type="button"
                                                    title="View shortlisting criteria for this role"
                                                    className="text-gray-400 hover:text-autumn-orange"
                                                    onClick={() =>
                                                        setOpenCriteriaId(openCriteriaId === candidate.id ? null : candidate.id)
                                                    }
                                                >
                                                    <Info className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {openCriteriaId === candidate.id && criteriaByJobId[candidate.application.jobId] && (
                                            <div className="mt-2 max-w-xs text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-2 whitespace-pre-line">
                                                {criteriaByJobId[candidate.application.jobId]}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${candidate.score >= 90 ? 'bg-autumn-green/10 text-autumn-green' :
                                                candidate.score >= 70 ? 'bg-autumn-yellow/10 text-autumn-yellow' :
                                                    'bg-autumn-red/10 text-autumn-red'}`}>
                                            {candidate.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PanelRatingCell
                                            ratings={ratingsByAppId[candidate.id] ?? []}
                                            myId={user?.id}
                                            onRate={(score) => handleRate(candidate.id, score)}
                                            onClear={() => handleClearRating(candidate.id)}
                                            onComment={() => handleRatingComment(candidate.id)}
                                        />
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
        </TooltipProvider>
    );
}

