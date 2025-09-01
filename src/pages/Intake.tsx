import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, Enums } from "@/integrations/supabase/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  User,
  Upload,
  Download,
  Scan,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type IntakeTaskWithPatient = Tables<"intake_tasks"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email"> | null;
};

const intakeSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  taskDescription: z.string().min(1, "Task description is required"),
  documentUrl: z.string().url().optional().or(z.literal("")),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

const IntakePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<IntakeTaskWithPatient | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      patientId: "",
      taskDescription: "",
      documentUrl: "",
    },
  });

  // Fetch intake tasks
  const {
    data: intakeTasks,
    isLoading,
    error,
    refetch,
  } = useQuery<IntakeTaskWithPatient[]>({
    queryKey: ["intakeTasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_tasks")
        .select(`
          *,
          patients (full_name, phone, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as IntakeTaskWithPatient[];
    },
  });

  // Fetch patients for the form
  const { data: patients } = useQuery<Tables<"patients">[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Filter and search intake tasks
  const filteredTasks = useMemo(() => {
    if (!intakeTasks) return [];

    return intakeTasks.filter((task) => {
      const matchesSearch = 
        task.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.task_description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [intakeTasks, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!intakeTasks) return { total: 0, pendingOcr: 0, needsValidation: 0, complete: 0 };

    return intakeTasks.reduce(
      (acc, task) => {
        acc.total++;
        switch (task.status) {
          case "Pending OCR":
            acc.pendingOcr++;
            break;
          case "Needs Validation":
            acc.needsValidation++;
            break;
          case "Complete":
            acc.complete++;
            break;
        }
        return acc;
      },
      { total: 0, pendingOcr: 0, needsValidation: 0, complete: 0 }
    );
  }, [intakeTasks]);

  const getStatusColor = (status: Enums<"intake_status">) => {
    switch (status) {
      case "Pending OCR":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Needs Validation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Complete":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: Enums<"intake_status">) => {
    switch (status) {
      case "Pending OCR":
        return <Scan className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Needs Validation":
        return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Complete":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <FileText className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Enums<"intake_status">) => {
    try {
      const { error } = await supabase
        .from("intake_tasks")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const processOcr = async (task: IntakeTaskWithPatient) => {
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await updateTaskStatus(task.id, "Needs Validation");
      
      toast({
        title: "OCR Processing Complete",
        description: `Document processed for ${task.patients?.full_name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process OCR",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: IntakeFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("intake_tasks")
        .insert({
          patient_id: data.patientId,
          task_description: data.taskDescription,
          document_url: data.documentUrl || null,
          status: "Pending OCR",
        });

      if (error) throw error;

      toast({
        title: "Intake Task Created",
        description: "The intake task has been added to the queue.",
      });

      form.reset();
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Creating Task",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600">Error Loading Intake Tasks</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Intake Automation Queue</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage document processing and patient intake tasks
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Intake Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Create Intake Task</DialogTitle>
              <DialogDescription className="text-sm">
                Add a new document or task to the intake automation queue.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Patient *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients?.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="flex flex-col">
                                <span className="text-sm">{patient.full_name}</span>
                                {patient.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    {patient.phone}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Task Description *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New Patient Packet">New Patient Packet</SelectItem>
                          <SelectItem value="Insurance Card">Insurance Card</SelectItem>
                          <SelectItem value="Referral Letter">Referral Letter</SelectItem>
                          <SelectItem value="Medical History Form">Medical History Form</SelectItem>
                          <SelectItem value="Consent Forms">Consent Forms</SelectItem>
                          <SelectItem value="Lab Results">Lab Results</SelectItem>
                          <SelectItem value="Prescription Forms">Prescription Forms</SelectItem>
                          <SelectItem value="ID Verification">ID Verification</SelectItem>
                          <SelectItem value="Other Document">Other Document</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Document URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/document.pdf" 
                          {...field} 
                          className="text-sm" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={loading}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto" size="sm">
                    {loading ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Scan className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.pendingOcr}</p>
                <p className="text-xs text-muted-foreground">Pending OCR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.needsValidation}</p>
                <p className="text-xs text-muted-foreground">Needs Validation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.complete}</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or task description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending OCR">Pending OCR</SelectItem>
                <SelectItem value="Needs Validation">Needs Validation</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Intake Tasks List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Intake Tasks ({filteredTasks.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredTasks.length === 0 && !isLoading
              ? "No intake tasks found."
              : "Click on a task to view details and take actions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 sm:h-4 w-[150px] sm:w-[200px]" />
                    <Skeleton className="h-3 sm:h-4 w-[100px] sm:w-[150px]" />
                  </div>
                  <Skeleton className="h-5 sm:h-6 w-[60px] sm:w-[80px]" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium">No intake tasks found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first intake task."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailsOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-50 rounded-full flex items-center justify-center">
                      {getStatusIcon(task.status)}
                    </div>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {task.patients?.full_name || "Unknown Patient"}
                        </h3>
                        {task.document_url && (
                          <Badge variant="outline" className="text-xs self-start sm:self-auto">
                            <FileText className="h-3 w-3 mr-1" />
                            Document
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{task.task_description}</span>
                        </div>
                        {task.patients?.phone && (
                          <div className="flex items-center gap-1">
                            <span className="truncate">{task.patients.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Created {format(parseISO(task.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge className={`${getStatusColor(task.status)} text-xs`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1">{task.status}</span>
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {task.status === "Pending OCR" && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            processOcr(task);
                          }}>
                            <Scan className="h-4 w-4 mr-2" />
                            Process OCR
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, "Needs Validation");
                        }}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Mark for Validation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, "Complete");
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                        {task.document_url && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(task.document_url!, '_blank');
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Document
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(task.document_url!, '_blank');
                            }}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Intake Task Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this intake automation task
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Patient Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Patient Name</label>
                    <p className="text-xs sm:text-sm font-medium">{selectedTask.patients?.full_name || "Unknown"}</p>
                  </div>
                  
                  {selectedTask.patients?.phone && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-xs sm:text-sm">{selectedTask.patients.phone}</p>
                    </div>
                  )}
                  
                  {selectedTask.patients?.email && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-xs sm:text-sm break-all">{selectedTask.patients.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Task Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Task Description</label>
                    <p className="text-xs sm:text-sm font-medium">{selectedTask.task_description}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={`${getStatusColor(selectedTask.status)} text-xs mt-1`}>
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1">{selectedTask.status}</span>
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedTask.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedTask.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </div>

              {/* Document Information */}
              {selectedTask.document_url && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Document</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-medium">Document attached</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(selectedTask.document_url!, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(selectedTask.document_url!, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t">
                {selectedTask.status === "Pending OCR" && (
                  <Button 
                    size="sm"
                    onClick={() => processOcr(selectedTask)}
                    className="w-full sm:w-auto"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Process OCR
                  </Button>
                )}
                <Button 
                  size="sm"
                  onClick={() => updateTaskStatus(selectedTask.id, "Needs Validation")}
                  disabled={selectedTask.status === "Needs Validation"}
                  className="w-full sm:w-auto"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark for Validation
                </Button>
                <Button 
                  size="sm"
                  onClick={() => updateTaskStatus(selectedTask.id, "Complete")}
                  disabled={selectedTask.status === "Complete"}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntakePage;