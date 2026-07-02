import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { Offer, getOffersPendingApproval, decideOfferApproval } from '../../services/offerService';

export function OfferApprovalPage() {
    const { user } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<Record<string, string>>({});

    const load = () => {
        if (!user) return;
        setLoading(true);
        getOffersPendingApproval(user.id)
            .then(setOffers)
            .catch((err) => console.error('Failed to load offers', err))
            .finally(() => setLoading(false));
    };

    useEffect(load, [user]);

    const decide = async (offer: Offer, decision: 'approved' | 'declined-approval') => {
        if (!user) return;
        const note = notes[offer.id]?.trim();
        if (decision === 'declined-approval' && !note) {
            alert('Please add a note explaining why you are declining.');
            return;
        }
        try {
            await decideOfferApproval(offer, decision, note || undefined, user);
            load();
        } catch (err: any) {
            alert(err?.message || 'Failed to record decision.');
        }
    };

    return (
        <div className="p-8 h-full flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Offer Approvals</h1>
                    <p className="text-gray-500">Review and approve pending job offers</p>
                </div>
                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    {offers.length} Pending Approval{offers.length === 1 ? '' : 's'}
                </div>
            </div>

            {loading && <p className="text-gray-500">Loading offers…</p>}

            {!loading && offers.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                    <CheckCircle className="size-12 mx-auto text-green-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">All caught up</p>
                    <p className="text-sm mt-1">No offers are waiting for your approval.</p>
                </div>
            )}

            <div className="space-y-6">
                {offers.map((offer) => (
                    <div key={offer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4">
                                <div className="size-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                    {offer.candidateName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <User className="size-4 text-gray-400" />
                                        {offer.candidateName}
                                    </h2>
                                    <p className="text-gray-600">{offer.jobTitle}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Prepared by {offer.createdByName}
                                        {offer.createdAt?.toDate ? ` on ${offer.createdAt.toDate().toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <DollarSign className="size-3" /> Compensation
                                </h3>
                                <p className="font-medium text-gray-900">{offer.currency} {offer.salary || '—'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <Calendar className="size-3" /> Start Date
                                </h3>
                                <p className="font-medium text-gray-900">{offer.startDate || '—'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-xs uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <FileText className="size-3" /> Notes
                                </h3>
                                <p className="font-medium text-gray-900 text-sm">{offer.notes || '—'}</p>
                            </div>
                        </div>

                        <textarea
                            value={notes[offer.id] ?? ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                            className="w-full h-20 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none mb-4"
                            placeholder="Add an approval comment or explain requested changes…"
                        />

                        <div className="flex gap-3">
                            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => decide(offer, 'approved')}>
                                <CheckCircle className="size-4" /> Approve Offer
                            </Button>
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                                onClick={() => decide(offer, 'declined-approval')}
                            >
                                <XCircle className="size-4" /> Decline
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
