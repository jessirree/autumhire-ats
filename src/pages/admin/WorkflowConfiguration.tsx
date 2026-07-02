import { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    Plus,
    Trash2,
    GripHorizontal,
    Edit2,
    ArrowRight,
    Check,
    User,
    Mail
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import {
    Workflow,
    WorkflowStage,
    StageRole as Role,
    DEFAULT_STAGES,
    getWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
} from '../../services/workflowService';

export type { Role, WorkflowStage };

const ITEM_TYPE = 'STAGE';

// --- Components ---

// 1. Draggable Stage Card
interface StageCardProps {
    stage: WorkflowStage;
    index: number;
    moveStage: (dragIndex: number, hoverIndex: number) => void;
    onUpdate: (id: string, updates: Partial<WorkflowStage>) => void;
    onDelete: (id: string) => void;
    isLast: boolean;
}

const StageCard = ({ stage, index, moveStage, onUpdate, onDelete, isLast }: StageCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(stage.name);

    const [{ handlerId }, drop] = useDrop({
        accept: ITEM_TYPE,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item: any, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();

            // Get horizontal middle
            const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the left
            const hoverClientX = (clientOffset as any).x - hoverBoundingRect.left;

            // Dragging rightwards
            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;

            // Dragging leftwards
            if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

            moveStage(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPE,
        item: () => ({ id: stage.id, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    const saveName = () => {
        if (editName.trim()) {
            onUpdate(stage.id, { name: editName });
        } else {
            setEditName(stage.name); // Revert if empty
        }
        setIsEditing(false);
    };

    return (
        <div className="flex items-center">
            <div
                ref={ref}
                data-handler-id={handlerId}
                className={`relative w-72 bg-white border rounded-xl shadow-sm group transition-all duration-200 ${isDragging ? 'opacity-0 scale-95' : 'opacity-100 hover:shadow-md hover:border-[var(--pumpkin-orange)]/50'
                    }`}
            >
                {/* Drag Handle */}
                <div className="absolute left-1/2 -top-3 -translate-x-1/2 bg-gray-100 rounded-full p-1 cursor-grab active:cursor-grabbing text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-[var(--pumpkin-orange)] hover:text-white">
                    <GripHorizontal className="size-4" />
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-col gap-3">
                    {/* Header: Name & Edit */}
                    <div className="flex items-start justify-between">
                        {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    autoFocus
                                    className="w-full text-sm font-semibold border-b border-[var(--pumpkin-orange)] focus:outline-none px-1"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={saveName}
                                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                                />
                                <button onClick={saveName} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                    <Check className="size-3" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group/title">
                                <span className="font-semibold text-gray-900">{stage.name}</span>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-gray-400 hover:text-[var(--pumpkin-orange)] opacity-0 group-hover/title:opacity-100 transition-opacity"
                                >
                                    <Edit2 className="size-3" />
                                </button>
                            </div>
                        )}

                        {!isEditing && (
                            <button onClick={() => onDelete(stage.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>

                    {/* Role Selector */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <User className="size-4 text-gray-400" />
                        <select
                            className="bg-transparent border-none text-xs font-medium focus:ring-0 p-0 cursor-pointer w-full text-gray-700"
                            value={stage.role}
                            onChange={(e) => onUpdate(stage.id, { role: e.target.value as Role })}
                        >
                            <option value="Recruiter">Recruiter</option>
                            <option value="Hiring Manager">Hiring Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {/* Auto-Email Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className={`size-3 ${stage.autoEmail ? 'text-[var(--pumpkin-orange)]' : 'text-gray-400'}`} />
                            <span>Auto-Email</span>
                        </div>
                        <button
                            onClick={() => onUpdate(stage.id, { autoEmail: !stage.autoEmail })}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)] focus:ring-offset-2 ${stage.autoEmail ? 'bg-[var(--pumpkin-orange)]' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${stage.autoEmail ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Connector */}
            {!isLast && (
                <div className="px-4 text-gray-300">
                    <ArrowRight className="size-6" />
                </div>
            )}
        </div>
    );
};

// 2. Main Builder Component
export function WorkflowConfiguration() {
    const { user } = useAuth();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [stages, setStages] = useState<WorkflowStage[]>(DEFAULT_STAGES);
    const [saving, setSaving] = useState(false);

    const load = async (selectId?: string) => {
        try {
            const list = await getWorkflows();
            setWorkflows(list);
            const target = list.find((w) => w.id === (selectId || selectedId)) || list[0];
            if (target) {
                setSelectedId(target.id);
                setStages(target.stages);
            }
        } catch (err) {
            console.error('Failed to load workflows', err);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSelectWorkflow = (id: string) => {
        setSelectedId(id);
        const wf = workflows.find((w) => w.id === id);
        if (wf) setStages(wf.stages);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            if (selectedId) {
                await updateWorkflow(selectedId, { stages }, user);
            } else {
                const name = prompt('Name for this workflow:', 'Standard');
                if (!name?.trim()) { setSaving(false); return; }
                const id = await createWorkflow(name.trim(), stages, user);
                await load(id);
            }
            alert('Workflow saved.');
        } catch (err: any) {
            alert(err?.message || 'Failed to save workflow.');
        } finally {
            setSaving(false);
        }
    };

    const handleNewWorkflow = async () => {
        if (!user) return;
        const name = prompt('Name for the new workflow (e.g. Executive Search):');
        if (!name?.trim()) return;
        try {
            const id = await createWorkflow(name.trim(), DEFAULT_STAGES, user);
            await load(id);
        } catch (err: any) {
            alert(err?.message || 'Failed to create workflow.');
        }
    };

    const handleDeleteWorkflow = async () => {
        if (!user || !selectedId) return;
        const wf = workflows.find((w) => w.id === selectedId);
        if (!confirm(`Delete workflow "${wf?.name}"?`)) return;
        await deleteWorkflow(selectedId, user);
        setSelectedId('');
        setStages(DEFAULT_STAGES);
        load();
    };

    const moveStage = useCallback((dragIndex: number, hoverIndex: number) => {
        setStages((prevStages) => {
            const updatedStages = [...prevStages];
            const [draggedStage] = updatedStages.splice(dragIndex, 1);
            updatedStages.splice(hoverIndex, 0, draggedStage);
            return updatedStages;
        });
    }, []);

    const handleUpdateStage = (id: string, updates: Partial<WorkflowStage>) => {
        setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleAddStage = () => {
        const newStage: WorkflowStage = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Stage',
            role: 'Recruiter',
            autoEmail: false,
        };
        setStages([...stages, newStage]);
    };

    const handleDeleteStage = (id: string) => {
        if (stages.length <= 2) {
            alert("A pipeline must have at least 2 stages.");
            return;
        }
        setStages(stages.filter(s => s.id !== id));
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-full flex flex-col p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Workflow Configuration</h2>
                        <p className="text-gray-500 mt-1">Design your hiring pipeline stages and automation rules</p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        {workflows.length > 0 && (
                            <select
                                value={selectedId}
                                onChange={(e) => handleSelectWorkflow(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none"
                            >
                                {workflows.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        )}
                        <Button variant="outline" onClick={handleNewWorkflow}>
                            New Workflow
                        </Button>
                        <Button variant="outline" onClick={() => setStages(DEFAULT_STAGES)}>
                            Reset to Default
                        </Button>
                        {selectedId && (
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteWorkflow}>
                                Delete
                            </Button>
                        )}
                        <Button
                            className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white"
                            disabled={saving}
                            onClick={handleSave}
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                {/* Builder Canvas */}
                <div className="flex-1 bg-gray-50/50 border border-dashed border-gray-300 rounded-xl p-8 overflow-x-auto">
                    <div className="min-w-max flex items-center h-full">

                        {/* Start Node */}
                        <div className="mr-4 flex flex-col items-center gap-2 opacity-50">
                            <div className="size-4 rounded-full bg-green-500" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start</span>
                        </div>

                        {/* Draggable Stages */}
                        {stages.map((stage, index) => (
                            <StageCard
                                key={stage.id}
                                index={index}
                                stage={stage}
                                moveStage={moveStage}
                                onUpdate={handleUpdateStage}
                                onDelete={handleDeleteStage}
                                isLast={index === stages.length - 1}
                            />
                        ))}

                        {/* Add Stage Button */}
                        <div className="ml-4">
                            <button
                                onClick={handleAddStage}
                                className="flex flex-col items-center justify-center w-20 h-72 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-[var(--pumpkin-orange)] hover:border-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/5 transition-all group"
                            >
                                <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                    <Plus className="size-5" />
                                </div>
                                <span className="text-xs font-medium">Add Stage</span>
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </DndProvider>
    );
}

