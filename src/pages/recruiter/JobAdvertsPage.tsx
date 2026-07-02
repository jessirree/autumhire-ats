import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { Search, Filter, Plus, Users, Zap, CalendarDays, ExternalLink, Briefcase } from 'lucide-react';

const mockAdverts = [
  {
    id: 'ADV-2024-001',
    title: 'Senior Frontend Developer',
    location: 'Remote',
    status: 'active',
    stats: { total: 45, longlisted: 12, shortlisted: 5, interviewed: 3, rejected: 25 },
    recruiters: [{ name: 'Sarah L.', id: '1' }, { name: 'Mike C.', id: '2' }],
    closingDate: '2024-04-15',
    boostStatus: 'premium',
  },
  {
    id: 'ADV-2024-002',
    title: 'Product Marketing Manager',
    location: 'New York, NY',
    status: 'draft',
    stats: { total: 0, longlisted: 0, shortlisted: 0, interviewed: 0, rejected: 0 },
    recruiters: [{ name: 'Alex R.', id: '3' }],
    closingDate: '2024-05-01',
    boostStatus: 'standard',
  },
  {
    id: 'ADV-2024-003',
    title: 'UX Designer',
    location: 'London, UK',
    status: 'active',
    stats: { total: 128, longlisted: 45, shortlisted: 15, interviewed: 6, rejected: 62 },
    recruiters: [{ name: 'Sarah L.', id: '1' }],
    closingDate: '2024-03-31',
    boostStatus: 'free',
  },
  {
    id: 'ADV-2024-004',
    title: 'DevOps Engineer',
    location: 'Remote',
    status: 'closed',
    stats: { total: 89, longlisted: 20, shortlisted: 8, interviewed: 4, rejected: 57 },
    recruiters: [{ name: 'Mike C.', id: '2' }, { name: 'David M.', id: '4' }],
    closingDate: '2024-02-28',
    boostStatus: 'premium',
  },
];

interface JobAdvertsPageProps {
  onViewApplications: (jobId: string) => void;
  onCreateAdvert: () => void;
}

export function JobAdvertsPage({ onViewApplications, onCreateAdvert }: JobAdvertsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAdverts = mockAdverts.filter(adv => {
    const matchesSearch = adv.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          adv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || adv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewPublicPage = (id: string, title: string) => {
    alert(`Opening public posting for ${id} (${title}) in a new tab...`);
  };

  const getBoostBadge = (boost: string) => {
    switch (boost) {
      case 'premium':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-700 border border-purple-200"><Zap className="size-3" /> Premium</span>;
      case 'standard':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 border border-blue-200"><Zap className="size-3" /> Standard</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 border border-gray-200">Free</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-autumn-charcoal mb-2">Job Adverts</h1>
          <p className="text-gray-500">Manage your published job postings and their visibility.</p>
        </div>
        <Button 
          onClick={onCreateAdvert}
          className="bg-autumn-primary hover:bg-autumn-dark text-white gap-2 rounded-xl"
        >
          <Plus className="size-4" />
          Create Advert
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search adverts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-primary/20 focus:border-autumn-primary appearance-none bg-white font-medium text-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline Stats</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hiring Team</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Closing Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAdverts.map((adv) => (
                <tr key={adv.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{adv.title}</span>
                      <span className="text-xs text-gray-500">{adv.id} â€¢ {adv.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-4 text-xs mt-1">
                      <div className="flex flex-col items-center" title="Total Applications"><span className="font-semibold text-gray-700">{adv.stats.total}</span><span className="text-gray-400 text-[10px] uppercase">Total</span></div>
                      <div className="flex flex-col items-center" title="Longlisted"><span className="font-semibold text-blue-600">{adv.stats.longlisted}</span><span className="text-gray-400 text-[10px] uppercase">Long</span></div>
                      <div className="flex flex-col items-center" title="Shortlisted"><span className="font-semibold text-amber-500">{adv.stats.shortlisted}</span><span className="text-gray-400 text-[10px] uppercase">Short</span></div>
                      <div className="flex flex-col items-center" title="Interviewed"><span className="font-semibold text-purple-600">{adv.stats.interviewed}</span><span className="text-gray-400 text-[10px] uppercase">Int</span></div>
                      <div className="flex flex-col items-center" title="Rejected"><span className="font-semibold text-red-500">{adv.stats.rejected}</span><span className="text-gray-400 text-[10px] uppercase">Rej</span></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex -space-x-2">
                       {adv.recruiters.map((recruiter, idx) => (
                         <div 
                           key={idx} 
                           className="size-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-xs font-bold text-autumn-charcoal"
                           title={`Recruiter: ${recruiter.name}`}
                         >
                           {recruiter.name.charAt(0)}
                         </div>
                       ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={adv.status} size="sm" />
                      {getBoostBadge(adv.boostStatus)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarDays className="size-4 text-gray-400" />
                      {adv.closingDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="h-8 gap-2 border-gray-200 hover:bg-gray-50 hover:text-autumn-primary"
                         onClick={() => onViewApplications(adv.id)}
                       >
                         <Users className="size-4" />
                         View Applications
                       </Button>
                      <button 
                        onClick={() => handleViewPublicPage(adv.id, adv.title)}
                        className="text-gray-400 hover:text-autumn-primary transition-colors p-1.5 rounded-lg hover:bg-orange-50" 
                        title="View Public Page"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAdverts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Briefcase className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No job adverts found</p>
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

