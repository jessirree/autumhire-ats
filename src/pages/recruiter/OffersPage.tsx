import { useState } from 'react';
import { Search, Filter, Mail, DollarSign, Clock, FileCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface Offer {
  id: string;
  candidateName: string;
  jobTitle: string;
  department: string;
  salary: string;
  status: 'pending' | 'accepted' | 'rejected' | 'draft' | 'pending_approval' | 'approved';
  expiryDate: string;
  sentDate: string | null;
}

const mockOffers: Offer[] = [
  {
    id: 'OFF-001',
    candidateName: 'Sarah Jenkins',
    jobTitle: 'Product Manager',
    department: 'Product',
    salary: '$145,000',
    status: 'pending',
    expiryDate: '2026-03-25',
    sentDate: '2026-03-18'
  },
  {
    id: 'OFF-002',
    candidateName: 'James Brown',
    jobTitle: 'Data Analyst',
    department: 'Analytics',
    salary: '$95,000',
    status: 'accepted',
    expiryDate: '2026-03-20',
    sentDate: '2026-03-10'
  },
  {
    id: 'OFF-003',
    candidateName: 'Emily Davis',
    jobTitle: 'UX Researcher',
    department: 'Design',
    salary: '$115,000',
    status: 'draft',
    expiryDate: '2026-04-01',
    sentDate: null
  },
  {
    id: 'OFF-004',
    candidateName: 'Michael Chen',
    jobTitle: 'Lead Engineer',
    department: 'Engineering',
    salary: '$160,000',
    status: 'pending_approval',
    expiryDate: '2026-04-10',
    sentDate: null
  }
];

interface OffersPageProps {
  onViewCandidateDetails?: (id: string) => void;
}

export function OffersPage({
  onViewCandidateDetails = (id) => alert(`Viewing full details for offer ${id}`)
}: OffersPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOffers = mockOffers.filter(offer => {
    const matchesSearch = offer.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          offer.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendOffer = (id: string, name: string) => {
    alert(`Sending offer to ${name} (${id})`);
  };

  const handleResendOffer = (id: string, name: string) => {
    alert(`Resending offer to ${name} (${id})`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Offers</h1>
          <p className="text-gray-500">Manage candidates at the offer stage, track responses, and send offer letters.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate or job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary bg-white text-gray-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft Offers</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved (Ready to Send)</option>
            <option value="pending">Sent (Pending Response)</option>
            <option value="accepted">Accepted ðŸŸ¢</option>
            <option value="rejected">Declined ðŸ”´</option>
          </select>
          
          <Button variant="outline" className="rounded-xl">
            <Filter className="size-4 mr-2" />
            More Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate / Job</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compensation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{offer.candidateName}</span>
                      <span className="text-sm text-gray-800 font-medium mt-0.5">{offer.jobTitle}</span>
                      <span className="text-xs text-gray-500">{offer.department}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-700 font-bold border border-green-100">
                       <DollarSign className="size-3" />
                       {offer.salary}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                       {offer.sentDate ? (
                         <div className="flex items-center gap-1.5 text-xs text-gray-600">
                           <FileCheck className="size-3.5 text-blue-500" /> Sent: {new Date(offer.sentDate).toLocaleDateString()}
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-xs text-gray-500 italic">
                           Not sent yet
                         </div>
                       )}
                       <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-100">
                         <Clock className="size-3.5" /> Expires: {new Date(offer.expiryDate).toLocaleDateString()}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 w-fit rounded-md text-xs font-bold border 
                      ${offer.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' : 
                        offer.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' : 
                        offer.status === 'pending' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                        offer.status === 'pending_approval' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {offer.status === 'pending_approval' ? 'Pending Approval' : offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {offer.status === 'draft' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 px-3"
                            onClick={() => alert(`Editing draft for ${offer.candidateName}`)}
                          >
                            Edit Draft
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 bg-autumn-primary hover:bg-autumn-dark text-white px-3 gap-1.5"
                            onClick={() => alert(`Requesting HM approval for ${offer.candidateName}`)}
                          >
                            Request Approval
                          </Button>
                        </>
                      )}
                      {(offer.status === 'pending_approval' || offer.status === 'pending' || offer.status === 'accepted' || offer.status === 'rejected') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-gray-200 hover:text-blue-600 hover:bg-blue-50 px-3"
                          onClick={() => onViewCandidateDetails(offer.id)}
                        >
                          View Details
                        </Button>
                      )}
                      {offer.status === 'approved' && (
                        <Button 
                          size="sm" 
                          className="h-8 bg-autumn-primary hover:bg-autumn-dark text-white px-3 gap-1.5"
                          onClick={() => handleSendOffer(offer.id, offer.candidateName)}
                        >
                          <Mail className="size-3.5" /> Send Offer
                        </Button>
                      )}
                      {offer.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 px-3 gap-1.5"
                          onClick={() => handleResendOffer(offer.id, offer.candidateName)}
                        >
                           <Mail className="size-3.5" /> Resend
                        </Button>
                      )}
                      {offer.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-gray-200 hover:text-autumn-primary hover:bg-orange-50 px-3 gap-1.5"
                          onClick={() => handleResendOffer(offer.id, offer.candidateName)}
                        >
                           <Mail className="size-3.5" /> Resend
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-gray-200 hover:text-blue-600 hover:bg-blue-50 px-3"
                        onClick={() => onViewCandidateDetails(offer.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOffers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileCheck className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No offers found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

