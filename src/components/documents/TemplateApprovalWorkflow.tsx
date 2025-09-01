import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Users, 
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye,
  FileText,
  Workflow,
  ArrowRight,
  CheckCheck,
  X
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate, TemplateApproval } from '@/types';

interface TemplateApprovalWorkflowProps {
  template: DocumentTemplate;
  onApprovalStatusChange?: (approvals: TemplateApproval[]) => void;
  className?: string;
}

const approvalSchema = z.object({
  comments: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

interface ApprovalStep {
  id: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  approverAvatar?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  comments?: string;
  approvedAt?: Date;
  isRequired: boolean;
  order: number;
}

export const TemplateApprovalWorkflow: React.FC<TemplateApprovalWorkflowProps> = ({
  template,
  onApprovalStatusChange,
  className = ""
}) => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<TemplateApproval[]>([]);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<TemplateApproval | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      comments: '',
    }
  });

  useEffect(() => {
    if (template.requiresApproval) {
      loadApprovals();
      generateApprovalSteps();
    }
  }, [template.id, template.requiresApproval]);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const approvalsData = await documentService.getTemplateApprovals(template.id);
      setApprovals(approvalsData);
      onApprovalStatusChange?.(approvalsData);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load approval status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateApprovalSteps = () => {
    // Mock approval workflow - in real implementation, this would come from the template's approval workflow configuration
    const mockSteps: ApprovalStep[] = [
      {
        id: '1',
        approverId: 'approver1',
        approverName: 'Dr. Sarah Johnson',
        approverEmail: 'sarah.johnson@clinic.com',
        status: 'approved',
        comments: 'Template looks good, approved for use.',
        approvedAt: new Date('2024-01-16T10:30:00'),
        isRequired: true,
        order: 1
      },
      {
        id: '2',
        approverId: 'approver2',
        approverName: 'Compliance Officer',
        approverEmail: 'compliance@clinic.com',
        status: 'pending',
        isRequired: true,
        order: 2
      },
      {
        id: '3',
        approverId: 'approver3',
        approverName: 'Medical Director',
        approverEmail: 'director@clinic.com',
        status: 'pending',
        isRequired: false,
        order: 3
      }
    ];

    setApprovalSteps(mockSteps);
  };

  const handleApprovalAction = async (data: ApprovalFormData) => {
    if (!selectedApproval) return;

    try {
      await documentService.updateTemplateApproval(
        selectedApproval.id,
        approvalAction,
        data.comments
      );

      toast({
        title: approvalAction === 'approve' ? "Template Approved" : "Template Rejected",
        description: `Template has been ${approvalAction}d successfully.`
      });

      form.reset();
      setIsApprovalDialogOpen(false);
      setSelectedApproval(null);
      await loadApprovals();
    } catch (error) {
      console.error('Failed to update approval:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestApproval = async () => {
    try {
      // In real implementation, this would trigger the approval workflow
      toast({
        title: "Approval Requested",
        description: "Approval request has been sent to all approvers."
      });
    } catch (error) {
      console.error('Failed to request approval:', error);
      toast({
        title: "Error",
        description: "Failed to request approval. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getOverallApprovalStatus = () => {
    const requiredSteps = approvalSteps.filter(step => step.isRequired);
    const approvedRequired = requiredSteps.filter(step => step.status === 'approved').length;
    const rejectedSteps = approvalSteps.filter(step => step.status === 'rejected');

    if (rejectedSteps.length > 0) {
      return { status: 'rejected', color: 'text-red-600', icon: XCircle };
    }

    if (approvedRequired === requiredSteps.length) {
      return { status: 'approved', color: 'text-green-600', icon: CheckCircle };
    }

    const pendingSteps = approvalSteps.filter(step => step.status === 'pending');
    if (pendingSteps.length > 0) {
      return { status: 'pending', color: 'text-yellow-600', icon: Clock };
    }

    return { status: 'draft', color: 'text-gray-600', icon: FileText };
  };

  const getApprovalProgress = () => {
    const totalRequired = approvalSteps.filter(step => step.isRequired).length;
    const approvedRequired = approvalSteps.filter(step => step.isRequired && step.status === 'approved').length;
    return totalRequired > 0 ? (approvedRequired / totalRequired) * 100 : 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      rejected: 'destructive',
      pending: 'secondary',
      withdrawn: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!template.requiresApproval) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Approval Required</h3>
            <p className="text-muted-foreground">
              This template does not require approval workflow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading approval status...</p>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallApprovalStatus();
  const StatusIcon = overallStatus.icon;
  const progress = getApprovalProgress();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              <CardTitle>Approval Workflow</CardTitle>
              {getStatusBadge(overallStatus.status)}
            </div>
            <div className="flex items-center gap-2">
              {overallStatus.status === 'draft' && (
                <Button onClick={handleRequestApproval}>
                  <Send className="h-4 w-4 mr-2" />
                  Request Approval
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={overallStatus.color} />
                <span className="font-medium capitalize">{overallStatus.status}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Approval Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label className="font-medium">Approval Steps</Label>
            </div>

            <div className="space-y-3">
              {approvalSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connection line */}
                  {index < approvalSteps.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
                  )}

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    {/* Step indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        step.status === 'approved' 
                          ? 'border-green-500 bg-green-50' 
                          : step.status === 'rejected'
                          ? 'border-red-500 bg-red-50'
                          : step.status === 'pending'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-muted bg-background'
                      }`}>
                        {getStatusIcon(step.status)}
                      </div>
                      <span className="text-xs font-medium mt-1">
                        Step {step.order}
                      </span>
                    </div>

                    {/* Step details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{step.approverName}</h4>
                            {step.isRequired && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {getStatusBadge(step.status)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {step.approverEmail}
                          </p>

                          {step.comments && (
                            <div className="bg-muted p-3 rounded-lg mb-2">
                              <div className="flex items-center gap-1 mb-1">
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-xs font-medium">Comments:</span>
                              </div>
                              <p className="text-sm">{step.comments}</p>
                            </div>
                          )}

                          {step.approvedAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {step.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                                {step.approvedAt.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons for pending approvals */}
                        {step.status === 'pending' && (
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Mock approval - in real implementation, check user permissions
                                setSelectedApproval({
                                  id: step.id,
                                  templateId: template.id,
                                  versionId: 'current',
                                  approverId: step.approverId,
                                  status: 'pending',
                                  createdAt: new Date(),
                                  updatedAt: new Date()
                                });
                                setApprovalAction('reject');
                                setIsApprovalDialogOpen(true);
                              }}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                // Mock approval - in real implementation, check user permissions
                                setSelectedApproval({
                                  id: step.id,
                                  templateId: template.id,
                                  versionId: 'current',
                                  approverId: step.approverId,
                                  status: 'pending',
                                  createdAt: new Date(),
                                  updatedAt: new Date()
                                });
                                setApprovalAction('approve');
                                setIsApprovalDialogOpen(true);
                              }}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Configuration */}
          {template.approvalWorkflow && (
            <div className="space-y-3 border-t pt-4">
              <Label className="font-medium">Workflow Configuration</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Require All Approvals:</span>
                  <span className="ml-2">
                    {template.approvalWorkflow.requireAllApprovals ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto-activate:</span>
                  <span className="ml-2">
                    {template.approvalWorkflow.autoActivateOnApproval ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {overallStatus.status === 'approved' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Template has been approved and is ready for use.
                {template.approvalWorkflow?.autoActivateOnApproval && 
                  " It will be automatically activated."
                }
              </AlertDescription>
            </Alert>
          )}

          {overallStatus.status === 'rejected' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Template has been rejected. Please review the comments and make necessary changes before resubmitting.
              </AlertDescription>
            </Alert>
          )}

          {overallStatus.status === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Template is pending approval. Approvers have been notified and will review the template.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Approval Action Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve Template' : 'Reject Template'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleApprovalAction)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                Comments {approvalAction === 'reject' ? '(Required for rejection)' : '(Optional)'}
              </Label>
              <Textarea
                id="comments"
                {...form.register('comments')}
                placeholder={
                  approvalAction === 'approve' 
                    ? "Add any comments about your approval..."
                    : "Please explain why you are rejecting this template..."
                }
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApprovalDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                className="flex-1"
              >
                {approvalAction === 'approve' ? (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateApprovalWorkflow;