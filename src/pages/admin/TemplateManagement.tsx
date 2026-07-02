import { useState, useMemo } from 'react';
import {
    FileText,
    Mail,
    MessageSquare,
    Plus,
    Edit2,
    Eye,
    Trash2,
    Search,
    X,
    Check,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';

// --- Types & Interfaces ---
// these can be moved to a shared types file later
export type TemplateCategory = 'Email' | 'Interview' | 'Job Ad';

export interface Template {
    id: string;
    name: string;
    category: TemplateCategory;
    subject?: string; // Only for Email
    content: string; // HTML or Markdown content
    lastModified: string;
    variablePlaceholders?: string[]; // e.g., ['{{candidate_name}}', '{{job_title}}']
    status: 'Active' | 'Draft' | 'Archived';
}

// --- Mock Data ---
const MOCK_TEMPLATES: Template[] = [
    // Email Templates
    {
        id: 'e1',
        name: 'Application Received',
        category: 'Email',
        subject: 'We have received your application for {{job_title}}',
        content: 'Hi {{candidate_name}},\n\nThanks for applying to Autumhire! We have received your application and our team is currently reviewing it.\n\nBest,\nThe Recruiting Team',
        lastModified: '2026-02-15',
        status: 'Active',
        variablePlaceholders: ['{{candidate_name}}', '{{job_title}}']
    },
    {
        id: 'e2',
        name: 'Interview Invitation',
        category: 'Email',
        subject: 'Invitation to Interview - {{job_title}}',
        content: 'Hello {{candidate_name}},\n\nWe were impressed by your profile and would like to invite you for an interview.\n\nPlease let us know your availability.\n\nRegards,\nThe Hiring Team',
        lastModified: '2026-02-10',
        status: 'Active',
        variablePlaceholders: ['{{candidate_name}}', '{{job_title}}']
    },
    {
        id: 'e3',
        name: 'Rejection Email',
        category: 'Email',
        subject: 'Update on your application for {{job_title}}',
        content: 'Dear {{candidate_name}},\n\nThank you for your interest. Unfortunately, we have decided to move forward with other candidates.\n\nWe wish you the best in your job search.',
        lastModified: '2026-01-20',
        status: 'Active',
        variablePlaceholders: ['{{candidate_name}}', '{{job_title}}']
    },

    // Interview Templates
    {
        id: 'i1',
        name: 'Frontend Developer Screening',
        category: 'Interview',
        content: '1. Explain the difference between React state and props.\n2. How do you optimize a React application?\n3. What is the Virtual DOM?',
        lastModified: '2026-02-01',
        status: 'Active',
        variablePlaceholders: []
    },
    {
        id: 'i2',
        name: 'Behavioral Interview',
        category: 'Interview',
        content: '1. Tell me about a time you faced a challenge.\n2. Describe a situation where you had to work with a difficult colleague.\n3. What are your greatest strengths?',
        lastModified: '2026-02-12',
        status: 'Active',
        variablePlaceholders: []
    },

    // Job Ad Templates
    {
        id: 'j1',
        name: 'Standard Engineering Role',
        category: 'Job Ad',
        content: '## About Us\nWe are a fast-growing tech company...\n\n## Responsibilities\n- Write clean code\n- Collaborate with the team\n\n## Requirements\n- 3+ years of experience\n- Bachelor degree in CS',
        lastModified: '2026-01-15',
        status: 'Active',
        variablePlaceholders: []
    },
    {
        id: 'j2',
        name: 'Sales Representative',
        category: 'Job Ad',
        content: '## Join our Sales Team!\n\nWe are looking for a motivated Sales Rep to join our team.\n\n## What you will do\n- Close deals\n- Build relationships',
        lastModified: '2025-12-05',
        status: 'Draft',
        variablePlaceholders: []
    }
];

export function TemplateManagement() {
    const [activeTab, setActiveTab] = useState<TemplateCategory>('Email');
    const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

    // Filtered Templates
    const filteredTemplates = useMemo(() => {
        return templates.filter(t =>
            t.category === activeTab &&
            (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.subject?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [templates, activeTab, searchTerm]);

    // Handlers
    const handleCreateNew = () => {
        const newTemplate: Template = {
            id: '', // Will be assigned on save
            name: '',
            category: activeTab,
            subject: activeTab === 'Email' ? '' : undefined,
            content: '',
            lastModified: new Date().toISOString().split('T')[0],
            status: 'Draft',
            variablePlaceholders: []
        };
        setCurrentTemplate(newTemplate);
        setIsEditModalOpen(true);
    };

    const handleEdit = (template: Template) => {
        setCurrentTemplate({ ...template });
        setIsEditModalOpen(true);
    };

    const handlePreview = (template: Template) => {
        setCurrentTemplate(template);
        setIsPreviewModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            setTemplates(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSave = (template: Template) => {
        if (!template.id) {
            // Create new
            const newTemplate = {
                ...template,
                id: Math.random().toString(36).substr(2, 9),
                lastModified: new Date().toISOString().split('T')[0]
            };
            setTemplates([...templates, newTemplate]);
        } else {
            // Update existing
            setTemplates(prev => prev.map(t => t.id === template.id ? { ...template, lastModified: new Date().toISOString().split('T')[0] } : t));
        }
        setIsEditModalOpen(false);
        setCurrentTemplate(null);
    };

    return (
        <div className="p-8 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Template Management</h2>
                    <p className="text-gray-500 mt-1">Manage email, interview, and job posting templates</p>
                </div>
                <Button
                    onClick={handleCreateNew}
                    className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white shadow-md shadow-orange-100"
                >
                    <Plus className="size-4 mr-2" />
                    Create Template
                </Button>
            </div>

            {/* Tabs & Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 flex-shrink-0">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        {(['Email', 'Interview', 'Job Ad'] as TemplateCategory[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab === 'Email' && <Mail className="size-4" />}
                                {tab === 'Interview' && <MessageSquare className="size-4" />}
                                {tab === 'Job Ad' && <FileText className="size-4" />}
                                {tab} Templates
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab.toLowerCase()} templates...`}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    {filteredTemplates.map(template => (
                        <div key={template.id} className="bg-white rounded-xl border border-gray-200 hover:border-[var(--pumpkin-orange)]/50 hover:shadow-md transition-all group flex flex-col h-full">
                            <div className="p-6 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${template.category === 'Email' ? 'bg-blue-50 text-blue-600' :
                                            template.category === 'Interview' ? 'bg-purple-50 text-purple-600' :
                                                'bg-green-50 text-green-600'
                                        }`}>
                                        {template.category === 'Email' && <Mail className="size-6" />}
                                        {template.category === 'Interview' && <MessageSquare className="size-6" />}
                                        {template.category === 'Job Ad' && <FileText className="size-6" />}
                                    </div>
                                    <div className="flex gap-1">
                                        <StatusBadge status={template.status} size="sm" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate" title={template.name}>
                                    {template.name}
                                </h3>

                                {template.subject && (
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                                        <span className="font-medium text-gray-700">Subject:</span> {template.subject}
                                    </p>
                                )}

                                <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                                    {template.content}
                                </p>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    Last updated: {template.lastModified}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handlePreview(template)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-gray-400 hover:text-[var(--pumpkin-orange)] hover:bg-orange-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredTemplates.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-gray-500">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <Search className="size-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
                            <p>Try adjusting your search or create a new template.</p>
                            <Button
                                onClick={handleCreateNew}
                                variant="outline"
                                className="mt-4"
                            >
                                Create {activeTab} Template
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit/Create Modal */}
            {isEditModalOpen && currentTemplate && (
                <EditTemplateModal
                    template={currentTemplate}
                    onSave={handleSave}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}

            {/* Preview Modal */}
            {isPreviewModalOpen && currentTemplate && (
                <PreviewTemplateModal
                    template={currentTemplate}
                    onClose={() => setIsPreviewModalOpen(false)}
                />
            )}
        </div>
    );
}

// --- Sub-components (Modals) ---

function EditTemplateModal({ template, onSave, onClose }: { template: Template, onSave: (t: Template) => void, onClose: () => void }) {
    const [formData, setFormData] = useState<Template>(template);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {template.id ? 'Edit Template' : 'Create New Template'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                placeholder="e.g. Interview Invitation"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm">
                                {formData.category}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="Active">Active</option>
                                <option value="Draft">Draft</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </div>

                        {formData.category === 'Email' && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                    placeholder="e.g. Update on your application"
                                    value={formData.subject || ''}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700">Content</label>
                                <span className="text-xs text-gray-400">Supports variable placeholders like {'{{name}}'}</span>
                            </div>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)] font-mono text-sm"
                                rows={10}
                                placeholder="Enter template content..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => onSave(formData)}
                        className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white"
                        disabled={!formData.name || !formData.content || (formData.category === 'Email' && !formData.subject)}
                    >
                        Save Template
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PreviewTemplateModal({ template, onClose }: { template: Template, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-3xl mx-auto">
                        <div className="mb-6 border-b border-gray-100 pb-4">
                            <h1 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h1>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-500 font-medium">
                                    {template.category}
                                </span>
                                <StatusBadge status={template.status} size="sm" />
                            </div>
                        </div>

                        {template.category === 'Email' && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm text-gray-600 border border-gray-100">
                                <p><span className="font-semibold text-gray-800">Subject:</span> {template.subject}</p>
                            </div>
                        )}

                        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                            {template.content}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
                    <Button onClick={onClose}>Close Preview</Button>
                </div>
            </div>
        </div>
    );
}

