import { useState, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    Plus,
    Trash2,
    GripVertical,
    CheckSquare,
    Type,
    List,
    ToggleLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';

// --- Types ---
export type QuestionType = 'Short Text' | 'Long Text' | 'Yes/No' | 'Multiple Choice' | 'File Upload';

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    required: boolean;
    score: number; // For automated scoring
    options?: string[]; // For Multiple Choice
}

const ITEM_TYPE = 'QUESTION';

// --- Components ---

// 1. Draggable Question Item
interface QuestionItemProps {
    question: Question;
    index: number;
    moveQuestion: (dragIndex: number, hoverIndex: number) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    isSelected: boolean;
}

const QuestionItem = ({ question, index, moveQuestion, onEdit, onDelete, isSelected }: QuestionItemProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop({
        accept: ITEM_TYPE,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item: any, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();

            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the top
            const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

            // Only perform the move when the mouse has crossed half of the items height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%

            // Dragging downwards
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }

            // Dragging upwards
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            moveQuestion(dragIndex, hoverIndex);

            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPE,
        item: () => {
            return { id: question.id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            className={`bg - white border rounded - lg p - 4 mb - 3 transition - all ${isDragging ? 'opacity-0' : 'opacity-100'
                } ${isSelected ? 'border-[var(--pumpkin-orange)] ring-1 ring-[var(--pumpkin-orange)]/20 shadow-md' : 'border-gray-200 hover:border-gray-300'
                } `}
        >
            <div className="flex items-start gap-3">
                <div className="cursor-grab text-gray-400 mt-1 hover:text-gray-600">
                    <GripVertical className="size-5" />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => onEdit(question.id)}>
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{question.text || 'New Question'}</h4>
                        <div className="flex gap-2">
                            {question.required && <StatusBadge status="Required" size="sm" />}
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {question.score} pts
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {question.type === 'Short Text' && <Type className="size-3" />}
                        {question.type === 'Long Text' && <List className="size-3" />}
                        {question.type === 'Yes/No' && <ToggleLeft className="size-3" />}
                        {question.type === 'Multiple Choice' && <CheckSquare className="size-3" />}
                        <span>{question.type}</span>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(question.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
        </div>
    );
};

// 2. Main Builder Component
export function PrescreeningBuilder() {
    const [questions, setQuestions] = useState<Question[]>([
        { id: '1', text: 'How many years of relevant experience do you have?', type: 'Short Text', required: true, score: 10 },
        { id: '2', text: 'Are you authorized to work in the required location?', type: 'Yes/No', required: true, score: 5 },
    ]);

    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

    const moveQuestion = useCallback((dragIndex: number, hoverIndex: number) => {
        setQuestions((prevQuestions) => {
            const updatedQuestions = [...prevQuestions];
            const [draggedQuestion] = updatedQuestions.splice(dragIndex, 1);
            updatedQuestions.splice(hoverIndex, 0, draggedQuestion);
            return updatedQuestions;
        });
    }, []);

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'New Question',
            type: 'Short Text',
            required: false,
            score: 0
        };
        setQuestions([...questions, newQuestion]);
        setSelectedQuestionId(newQuestion.id);
    };

    const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
        if (selectedQuestionId === id) setSelectedQuestionId(null);
    };

    const selectedQuestion = questions.find(q => q.id === selectedQuestionId);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-full flex flex-col p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Pre-screening Builder</h2>
                        <p className="text-gray-500 mt-1">Design screening questionnaires to qualify candidates automatically</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            Save as Template
                        </Button>
                        <Button className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white">
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Content - Main Layout */}
                <div className="flex-1 flex gap-8 h-[calc(100vh-200px)]">

                    {/* Left Column: Questions List */}
                    <div className="w-1/3 flex flex-col bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Questions</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{questions.length} items</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {questions.map((q, index) => (
                                <QuestionItem
                                    key={q.id}
                                    index={index}
                                    question={q}
                                    moveQuestion={moveQuestion}
                                    onEdit={setSelectedQuestionId}
                                    onDelete={handleDeleteQuestion}
                                    isSelected={selectedQuestionId === q.id}
                                />
                            ))}

                            <Button
                                onClick={handleAddQuestion}
                                variant="outline"
                                className="w-full border-dashed border-2 py-6 text-gray-500 hover:text-[var(--pumpkin-orange)] hover:border-[var(--pumpkin-orange)] hover:bg-orange-50"
                            >
                                <Plus className="size-4 mr-2" />
                                Add Question
                            </Button>
                        </div>
                    </div>

                    {/* Middle/Right Column: Editor & Preview */}
                    <div className="flex-1 flex gap-8">

                        {/* Editor Panel (Middle) - Only if selected */}
                        {selectedQuestion ? (
                            <div className="w-1/2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-semibold text-gray-900">Edit Question</h3>
                                </div>
                                <div className="p-6 space-y-5 overflow-y-auto flex-1">

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                            value={selectedQuestion.text}
                                            onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { text: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                                value={selectedQuestion.type}
                                                onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { type: e.target.value as QuestionType })}
                                            >
                                                <option value="Short Text">Short Text</option>
                                                <option value="Long Text">Long Text</option>
                                                <option value="Yes/No">Yes/No</option>
                                                <option value="Multiple Choice">Multiple Choice</option>
                                                <option value="File Upload">File Upload</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Score Value</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                                                value={selectedQuestion.score}
                                                onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { score: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="required-toggle"
                                            checked={selectedQuestion.required}
                                            onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { required: e.target.checked })}
                                            className="rounded border-gray-300 text-[var(--pumpkin-orange)] focus:ring-[var(--pumpkin-orange)]"
                                        />
                                        <label htmlFor="required-toggle" className="text-sm font-medium text-gray-700">Required Question</label>
                                    </div>

                                    {/* Multiple Choice Options */}
                                    {selectedQuestion.type === 'Multiple Choice' && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                                            <div className="space-y-2">
                                                {(selectedQuestion.options || []).map((option, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...(selectedQuestion.options || [])];
                                                                newOptions[idx] = e.target.value;
                                                                handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newOptions = [...(selectedQuestion.options || [])];
                                                                newOptions.splice(idx, 1);
                                                                handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        const newOptions = [...(selectedQuestion.options || []), 'New Option'];
                                                        handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                                                    }}
                                                >
                                                    <Plus className="size-3 mr-1" /> Add Option
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        ) : (
                            <div className="w-1/2 flex items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                                <p>Select a question to edit</p>
                            </div>
                        )}

                        {/* Live Preview (Right) */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">Live Preview</h3>
                                <span className="text-xs text-gray-500">Candidate View</span>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 bg-white">
                                <div className="max-w-md mx-auto space-y-6">
                                    {questions.map((q, i) => (
                                        <div key={q.id} className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-800">
                                                {i + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                                            </label>

                                            {q.type === 'Short Text' && (
                                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" disabled placeholder="Short answer text..." />
                                            )}

                                            {q.type === 'Long Text' && (
                                                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" rows={3} disabled placeholder="Long answer text..." />
                                            )}

                                            {q.type === 'Yes/No' && (
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2">
                                                        <input type="radio" name={`q - ${q.id} `} disabled /> Yes
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <input type="radio" name={`q - ${q.id} `} disabled /> No
                                                    </label>
                                                </div>
                                            )}

                                            {q.type === 'Multiple Choice' && (
                                                <div className="space-y-2">
                                                    {(q.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                                                        <label key={idx} className="flex items-center gap-2">
                                                            <input type="radio" name={`q - ${q.id} `} disabled />
                                                            <span className="text-sm text-gray-700">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {questions.length > 0 && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <Button disabled className="w-full bg-blue-600 text-white opacity-50 cursor-not-allowed">
                                                Submit Application
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </DndProvider>
    );
}

