import { useEffect, useState } from 'react';
import { Users, Mail, FileText, Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { UserManagement } from './UserManagement';
import { db } from '../../lib/firebase';
import { Job, getJobs, closeJob } from '../../services/jobService';
import { Template, getTemplates } from '../../services/templateService';
import { useAuth } from '../../context/AuthContext';
import { TemplateManagement } from './TemplateManagement';
import { WorkflowConfiguration } from './WorkflowConfiguration';
import { Workflow, getWorkflows } from '../../services/workflowService';
import { AuditEntry, getAuditLog } from '../../services/auditService';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  initialTab?: 'users' | 'jobs' | 'templates' | 'screening' | 'workflow' | 'audit';
}

export function AdminDashboard({ onNavigate, initialTab = 'users' }: AdminDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const loadJobs = async () => {
    try {
      setJobs(await getJobs());
    } catch (err) {
      console.error('Failed to load jobs', err);
    }
  };

  useEffect(() => {
    loadJobs();
    getDocs(collection(db, 'Users'))
      .then((snap) => setUserCount(snap.size))
      .catch(() => setUserCount(0));
    getTemplates().then(setTemplates).catch(() => {});
    getWorkflows().then(setWorkflows).catch(() => {});
    getAuditLog().then(setAuditLog).catch(() => {});
  }, []);

  const handleCloseJob = async (job: Job) => {
    if (!user) return;
    if (!confirm(`Close "${job.title}"? Candidates will no longer be able to apply.`)) return;
    await closeJob(job.id, user);
    loadJobs();
  };

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
              <p className="text-3xl font-semibold">{userCount}</p>
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
              <p className="text-3xl font-semibold">{jobs.filter((j) => j.status === 'Active' || j.status === 'Re-advertised').length}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Templates</p>
              <p className="text-3xl font-semibold">{templates.length}</p>
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
              <p className="text-3xl font-semibold">{workflows.length}</p>
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
              { id: 'audit', label: 'Audit Trail' },
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
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {job.title}
                          <span className="block text-xs text-gray-400 font-normal">{job.referenceNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{job.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-500">{job.location}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {job.postedAt?.toDate ? job.postedAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 hover:bg-gray-100 rounded text-blue-500"
                              title="Edit"
                              onClick={() => onNavigate(`edit-job/${job.id}`)}
                            >
                              <Edit2 className="size-4" />
                            </button>
                            {(job.status === 'Active' || job.status === 'Re-advertised') && (
                              <button
                                className="p-1 hover:bg-gray-100 rounded text-red-500"
                                title="Close job"
                                onClick={() => handleCloseJob(job)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
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
            <TemplateManagement />
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
            <WorkflowConfiguration />
          )}

          {activeTab === 'audit' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Audit Trail</h3>
                <span className="text-sm text-gray-500">{auditLog.length} most recent actions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLog.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {entry.at?.toDate ? entry.at.toDate().toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.actorName}</td>
                        <td className="px-4 py-3"><StatusBadge status={entry.action} size="sm" /></td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.entity} <span className="text-xs text-gray-400">{entry.entityId}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{entry.detail}</td>
                      </tr>
                    ))}
                    {auditLog.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit entries yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

