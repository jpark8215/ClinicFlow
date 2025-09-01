// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Eye,
    User,
    Search,
    RefreshCw,
    FileText,
    Brain,
    Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ValidationError, ValidationWarning, AIRecommendation } from '@/services/automatedIntakeService';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface ManualReviewTask {
    id: string;
    intake_task_id: string;
    document_id?: string;
    review_type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_review' | 'completed' | 'rejected';
    assigned_to?: string;
    metadata: {
        errors?: ValidationError[];
        warnings?: ValidationWarning[];
        confidence?: number;
        recommendations?: AIRecommendation[];
    };
    reviewer_notes?: string;
    corrected_data?: any;
    created_at: string;
    updated_at: string;
    // Joined data
    task_description?: string;
    patient_name?: string;
    document_type?: string;
}

interface ManualReviewQueueProps {
    className?: string;
}

export const ManualReviewQueue: React.FC<ManualReviewQueueProps> = ({ className }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [selectedTask, setSelectedTask] = useState<ManualReviewTask | null>(null);
    const { toast } = useToast();

    // Fetch manual review tasks
    const {
        data: reviewTasks,
        isLoading,
        error,
        refetch
    } = useQuery<ManualReviewTask[]>({
        queryKey: ['manualReviewTasks', statusFilter, priorityFilter],
        queryFn: async () => {
            let query = supabase
                .from('manual_review_queue')
                .select(`
          *,
          intake_tasks!inner(task_description, patient_id),
          patients!intake_tasks.patient_id(full_name),
          documents(document_type)
        `);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            return data.map((item: any) => ({
                ...item,
                task_description: item.intake_tasks?.task_description,
                patient_name: item.patients?.full_name,
                document_type: item.documents?.document_type
            })) as ManualReviewTask[];
        },
        refetchInterval: 30000
    });

    // Assign task to current user
    const assignTaskMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase
                .from('manual_review_queue')
                .update({
                    assigned_to: (await supabase.auth.getUser()).data.user?.id,
                    status: 'in_review',
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Task Assigned",
                description: "Task has been assigned to you for review."
            });
            refetch();
        }
    });

    // Complete review task
    const completeTaskMutation = useMutation({
        mutationFn: async ({ taskId, notes, correctedData }: {
            taskId: string;
            notes?: string;
            correctedData?: any;
        }) => {
            const { error } = await supabase
                .from('manual_review_queue')
                .update({
                    status: 'completed',
                    reviewer_notes: notes,
                    corrected_data: correctedData,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Review Completed",
                description: "Task review has been completed successfully."
            });
            refetch();
            setSelectedTask(null);
        }
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent':
            case 'high':
                return <AlertTriangle className="h-4 w-4" />;
            case 'medium':
                return <Clock className="h-4 w-4" />;
            case 'low':
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'in_review':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredTasks = reviewTasks?.filter((task: ManualReviewTask) => {
        const matchesSearch = !searchTerm ||
            task.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.task_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.document_type?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    }) || [];

    return (
        <div className={className}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Manual Review Queue
                            </CardTitle>
                            <CardDescription>
                                Tasks requiring human review and validation
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isLoading}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search by patient name, task, or document type..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Task List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load manual review tasks. Please try again.
                            </AlertDescription>
                        </Alert>
                    ) : filteredTasks.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTasks.map((task) => (
                                <Card key={task.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                                    {getPriorityIcon(task.priority)}
                                                    <span className="ml-1 capitalize">{task.priority}</span>
                                                </div>
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {task.review_type.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold">{task.patient_name || 'Unknown Patient'}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {task.task_description} • {task.document_type}
                                                </p>
                                            </div>

                                            {/* Validation Issues */}
                                            {task.metadata.errors && task.metadata.errors.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-red-600">Validation Errors:</p>
                                                    {task.metadata.errors.slice(0, 2).map((error: ValidationError, index: number) => (
                                                        <p key={index} className="text-xs text-red-600 ml-2">
                                                            • {error.message}
                                                        </p>
                                                    ))}
                                                    {task.metadata.errors.length > 2 && (
                                                        <p className="text-xs text-muted-foreground ml-2">
                                                            +{task.metadata.errors.length - 2} more errors
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Warnings */}
                                            {task.metadata.warnings && task.metadata.warnings.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-orange-600">Warnings:</p>
                                                    {task.metadata.warnings.slice(0, 2).map((warning: ValidationWarning, index: number) => (
                                                        <p key={index} className="text-xs text-orange-600 ml-2">
                                                            • {warning.message}
                                                        </p>
                                                    ))}
                                                    {task.metadata.warnings.length > 2 && (
                                                        <p className="text-xs text-muted-foreground ml-2">
                                                            +{task.metadata.warnings.length - 2} more warnings
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* AI Recommendations */}
                                            {task.metadata.recommendations && task.metadata.recommendations.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-blue-600">AI Recommendations:</p>
                                                    {task.metadata.recommendations.slice(0, 1).map((rec: AIRecommendation, index: number) => (
                                                        <p key={index} className="text-xs text-blue-600 ml-2">
                                                            • {rec.message}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Created: {format(parseISO(task.created_at), 'MMM dd, yyyy HH:mm')}</span>
                                                {task.metadata.confidence && (
                                                    <span>Confidence: {Math.round(task.metadata.confidence * 100)}%</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedTask(task)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Review
                                            </Button>

                                            {task.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => assignTaskMutation.mutate(task.id)}
                                                    disabled={assignTaskMutation.isPending}
                                                >
                                                    <User className="h-4 w-4 mr-1" />
                                                    Assign to Me
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No manual review tasks found</p>
                            <p className="text-sm">Tasks requiring human review will appear here</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task Detail Modal/Panel */}
            {selectedTask && (
                <TaskReviewModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onComplete={(notes?: string, correctedData?: any) =>
                        completeTaskMutation.mutate({
                            taskId: selectedTask.id,
                            notes,
                            correctedData
                        })
                    }
                />
            )}
        </div>
    );
};

// Task Review Modal Component
interface TaskReviewModalProps {
    task: ManualReviewTask;
    onClose: () => void;
    onComplete: (notes?: string, correctedData?: any) => void;
}

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({ task, onClose, onComplete }) => {
    const [reviewNotes, setReviewNotes] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">Review Task</h2>
                        <Button variant="ghost" onClick={onClose}>
                            ×
                        </Button>
                    </div>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Task Details</TabsTrigger>
                            <TabsTrigger value="validation">Validation Issues</TabsTrigger>
                            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium">Patient Name</Label>
                                    <p className="text-sm">{task.patient_name || 'Unknown'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Task Type</Label>
                                    <p className="text-sm">{task.task_description}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Document Type</Label>
                                    <p className="text-sm">{task.document_type}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Review Type</Label>
                                    <p className="text-sm">{task.review_type.replace('_', ' ')}</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="validation" className="space-y-4">
                            {task.metadata.errors && task.metadata.errors.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-red-600 mb-2">Validation Errors</h4>
                                    <div className="space-y-2">
                                        {task.metadata.errors.map((error: ValidationError, index: number) => (
                                            <Alert key={index} variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>{error.field || 'General'}:</strong> {error.message}
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {task.metadata.warnings && task.metadata.warnings.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-orange-600 mb-2">Warnings</h4>
                                    <div className="space-y-2">
                                        {task.metadata.warnings.map((warning: ValidationWarning, index: number) => (
                                            <Alert key={index}>
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>{warning.field || 'General'}:</strong> {warning.message}
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="recommendations" className="space-y-4">
                            {task.metadata.recommendations && task.metadata.recommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {task.metadata.recommendations.map((rec: AIRecommendation, index: number) => (
                                        <Card key={index} className="p-4">
                                            <div className="flex items-start gap-3">
                                                <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${rec.priority === 'high' ? 'border-red-200 text-red-700' :
                                                                rec.priority === 'medium' ? 'border-orange-200 text-orange-700' :
                                                                    'border-blue-200 text-blue-700'
                                                            }`}>
                                                            {rec.priority} priority
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">{rec.type}</span>
                                                    </div>
                                                    <p className="text-sm">{rec.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Suggested action: {rec.action}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No AI recommendations available for this task.</p>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Review Notes */}
                    <div className="mt-6 space-y-4">
                        <div>
                            <Label htmlFor="reviewNotes" className="text-sm font-medium">
                                Review Notes
                            </Label>
                            <Textarea
                                id="reviewNotes"
                                placeholder="Add your review notes here..."
                                value={reviewNotes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewNotes(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={() => onComplete(reviewNotes, undefined)}>
                                Complete Review
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};