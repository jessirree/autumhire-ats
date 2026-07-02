import { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Calendar, Briefcase, User, FileText, AlertCircle, TrendingUp, Award } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function OfferApprovalPage() {
    const [note, setNote] = useState('');

    // Mock Data for a pending offer
    const offer = {
        id: 'off-123',
        candidate: {
            name: 'Michael Chen',
            role: 'Product Manager',
            experience: '4 years',
            email: 'michael.chen@example.com',
            phone: '+1 (555) 987-6543'
        },
        details: {
            baseSalary: 135000,
            currency: 'USD',
            bonus: '15% Annual Performance Bonus',
            stockOptions: '$50,000 in Company Stock (Granted over 4 years)',
            startDate: '2026-03-15',
            location: 'San Francisco, CA (Hybrid)',
            benefits: ['Health, Dental, Vision', '401(k) Match', 'Unlimited PTO', 'Home Office Stipend']
        },
        status: 'Pending Approval',
        preparedBy: 'Sarah Lee (Recruiter)',
        datePrepared: '2026-03-01',
        recruiterJustification: 'Candidate counter-offered slightly above midpoint. Given their strong technical performance and domain expertise, we strongly recommend approval to secure this hire.',
        interviewScores: [
            { stage: 'Technical Assessment', score: 92, outOf: 100 },
            { stage: 'System Design', score: 88, outOf: 100 },
            { stage: 'Culture Fit', score: 95, outOf: 100 }
        ]
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const handleApprove = () => {
        alert(`Offer approved for ${offer.candidate.name}. Notification sent to Recruiter.`);
        // In real app: API call to update status to 'Approved'
    };

    const handleRequestChanges = () => {
        if (!note.trim()) {
            alert('Please add a note explaining the requested changes.');
            return;
        }
        alert(`Changes requested for ${offer.candidate.name}. Note sent to Recruiter.`);
        // In real app: API call to update status to 'Changes Requested' with note
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
                    1 Pending Approval
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Offer Context */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Candidate Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="size-5 text-gray-400" />
                            Candidate Summary
                        </h2>
                        <div className="flex items-start gap-4">
                            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                                {offer.candidate.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900">{offer.candidate.name}</h3>
                                <p className="text-gray-600">{offer.candidate.role}</p>
                                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                    <span>{offer.candidate.experience} Experience</span>
                                    <span>â€¢</span>
                                    <span>{offer.candidate.email}</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                View Full Profile
                            </Button>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Interview Performance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {offer.interviewScores.map((score, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{score.stage}</span>
                                        <span className="text-sm font-bold text-gray-900">{score.score}<span className="text-gray-400 font-normal">/{score.outOf}</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Offer Details */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="size-5 text-gray-400" />
                                Offer Details
                            </h2>
                            <div className="text-sm text-gray-500">
                                Prepared by <span className="font-semibold">{offer.preparedBy}</span> on {offer.datePrepared}
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                <div className="text-sm text-green-700 font-medium mb-1 flex items-center gap-2">
                                    <DollarSign className="size-4" /> Base Salary
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{formatCurrency(offer.details.baseSalary)}</div>
                                <div className="text-xs text-gray-500 mt-1">Per Annum</div>
                            </div>

                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="text-sm text-purple-700 font-medium mb-1 flex items-center gap-2">
                                    <TrendingUp className="size-4" /> Equity / Stock Options
                                </div>
                                <div className="text-xl font-bold text-gray-900">{offer.details.stockOptions}</div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="text-sm text-blue-700 font-medium mb-1 flex items-center gap-2">
                                    <Award className="size-4" /> Bonus Structure
                                </div>
                                <div className="text-lg font-bold text-gray-900">{offer.details.bonus}</div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="text-sm text-gray-700 font-medium mb-1 flex items-center gap-2">
                                    <Calendar className="size-4" /> Start Date
                                </div>
                                <div className="text-lg font-bold text-gray-900">{new Date(offer.details.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Briefcase className="size-4 text-gray-400" /> Additional Benefits
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {offer.details.benefits.map((benefit, idx) => (
                                        <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                            {benefit}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 mt-2">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <FileText className="size-4 text-gray-400" /> Recruiter Justification
                                </h3>
                                <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 text-sm text-gray-700 leading-relaxed italic">
                                    "{offer.recruiterJustification}"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Decision Actions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit sticky top-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Hiring Decision</h2>

                    <div className="space-y-4 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Decision Notes
                        </label>
                        <textarea
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-autumn-orange focus:border-autumn-orange text-sm resize-none"
                            placeholder="Add approval notes or details on requested changes..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                            These notes will be shared with the recruiter.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            onClick={handleApprove}
                        >
                            <CheckCircle className="size-5 mr-2" /> Approve Offer
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            onClick={handleRequestChanges}
                        >
                            <XCircle className="size-5 mr-2" /> Request Changes
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Workflow Status</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 opacity-50">
                                <div className="size-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">âœ“</div>
                                <span className="text-sm text-gray-600">Offer Created</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold animate-pulse">2</div>
                                <span className="text-sm font-medium text-gray-900">Pending HM Approval</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-50">
                                <div className="size-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">3</div>
                                <span className="text-sm text-gray-600">Send to Candidate</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

