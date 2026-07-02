import { useState } from 'react';
import { Users, Mail, FileText, Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { UserManagement } from './UserManagement';

// Mock data for other tabs
interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  lastModified: string;
}

// Keep mockUsers ONLY for the stats card count to avoid breaking it. 
// In a real app, this would come from an API or a shared context.
const mockUsersCount = 5;

const mockTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Application Received',
    type: 'Candidate Communication',
    subject: 'Thank you for your application',
    lastModified: '2026-01-15',
  },
  {
    id: '2',
    name: 'Interview Invitation',
    type: 'Interview',
    subject: 'Interview invitation for {{position}}',
    lastModified: '2026-01-20',
  },
  {
    id: '3',
    name: 'Rejection Letter',
    type: 'Candidate Communication',
    subject: 'Update on your application',
    lastModified: '2026-01-18',
  },
  {
    id: '4',
    name: 'Offer Letter',
    type: 'Offer',
    subject: 'Job Offer - {{position}}',
    lastModified: '2026-02-01',
  },
];

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  initialTab?: 'users' | 'jobs' | 'templates' | 'screening' | 'workflow';
}

export function AdminDashboard({ onNavigate, initialTab = 'users' }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [jobs, setJobs] = useState<any[]>([]);

  // Load jobs from localStorage + Mock
  useState(() => {
    const localJobs = JSON.parse(localStorage.getItem('mockJobs') || '[]');
    setJobs([...localJobs]);
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">System Administration</h1>
          <p className="text-gray-600">Manage users, templates, and system configuration</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-semibold">{mockUsersCount}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
              <p className="text-3xl font-semibold">{jobs.length}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Email Templates</p>
              <p className="text-3xl font-semibold">{mockTemplates.length}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Mail className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Workflows</p>
              <p className="text-3xl font-semibold">5</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Settings className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { id: 'users', label: 'User Management' },
              { id: 'jobs', label: 'Jobs Management' },
              { id: 'templates', label: 'Email Templates' },
              { id: 'screening', label: 'Pre-screening Builder' },
              { id: 'workflow', label: 'Workflow Configuration' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <UserManagement />
          )}

          {activeTab === 'jobs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">All Jobs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {jobs.map((job, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                        <td className="px-6 py-4 text-gray-500">{job.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-500">{job.location}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-gray-500">{job.posted || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 hover:bg-gray-100 rounded text-blue-500"
                              title="Edit"
                              onClick={() => {
                                // For MVP, we'll just pass the ID. In a real app key off ID.
                                // We are using mock data so indices match IDs 1,2,3...
                                // Let's assume we pass a special route format 'edit-job-[ID]'
                                onNavigate(`edit-job-${job.id || (index + 1)}`);
                              }}
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded text-red-500" title="Delete">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No jobs found. Click "Post New Job" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Email Templates</h3>
                <Button style={{ backgroundColor: 'var(--blue-accent)' }}>
                  <Plus className="size-4 mr-2" />
                  Create Template
                </Button>
              </div>
              <div className="space-y-3">
                {mockTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-5 hover:border-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{template.name}</h4>
                          <StatusBadge status={template.type} size="sm" />
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{template.subject}</p>
                        <p className="text-xs text-gray-500">
                          Last modified: {new Date(template.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="size-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">Preview</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'screening' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Pre-screening Questions</h3>
                <Button style={{ backgroundColor: 'var(--blue-accent)' }}>
                  <Plus className="size-4 mr-2" />
                  Add Question
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  {
                    question: 'Resume',
                    type: 'File Upload',
                    required: true,
                    weight: 10,
                  },
                  {
                    question: 'Cover Letter',
                    type: 'File Upload',
                    required: true,
                    weight: 10,
                  },
                  {
                    question: 'First Name',
                    type: 'Short Text',
                    required: true,
                    weight: 5,
                  },
                  {
                    question: 'Last Name',
                    type: 'Short Text',
                    required: true,
                    weight: 5,
                  },
                  {
                    question: 'Email Address',
                    type: 'Short Text',
                    required: true,
                    weight: 5,
                  },
                  {
                    question: 'Phone Number',
                    type: 'Short Text',
                    required: true,
                    weight: 5,
                  },
                ].map((q, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{q.question}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Type: {q.type}</span>
                          <span>â€¢</span>
                          <span>Weight: {q.weight} points</span>
                          <span>â€¢</span>
                          {q.required && <StatusBadge status="Required" size="sm" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="size-4 mr-2" />
                          Edit
                        </Button>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <Trash2 className="size-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Approval Workflows</h3>
                <Button style={{ backgroundColor: 'var(--blue-accent)' }}>
                  <Plus className="size-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  {
                    name: 'Job Requisition Approval',
                    steps: ['Department Head', 'HR Director', 'CFO'],
                    status: 'Active',
                  },
                  {
                    name: 'Offer Letter Approval',
                    steps: ['Hiring Manager', 'HR Director'],
                    status: 'Active',
                  },
                  {
                    name: 'Contract Approval',
                    steps: ['Legal', 'HR Director', 'CFO'],
                    status: 'Active',
                  },
                ].map((workflow, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{workflow.name}</h4>
                          <StatusBadge status={workflow.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Approval Chain:</span>
                          {workflow.steps.map((step, i) => (
                            <span key={i}>
                              {step}
                              {i < workflow.steps.length - 1 && ' â†’ '}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="size-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

