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
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
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

const preauthSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  service: z.string().min(1, "Service is required"),
  payer: z.string().min(1, "Payer is required"),
  requestedAmount: z.string().optional(),
  notes: z.string().optional(),
});

type PreauthFormData = z.infer<typeof preauthSchema>;

const PriorAuthorizationPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAuth, setSelectedAuth] = useState<Tables<"pre_authorizations"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Tables<"pre_authorizations"> | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PreauthFormData>({
    resolver: zodResolver(preauthSchema),
    defaultValues: {
      patientName: "",
      service: "",
      payer: "",
      requestedAmount: "",
      notes: "",
    },
  });

  const editForm = useForm<PreauthFormData>({
    resolver: zodResolver(preauthSchema),
    defaultValues: {
      patientName: "",
      service: "",
      payer: "",
      requestedAmount: "",
      notes: "",
    },
  });

  // Fetch prior authorizations
  const {
    data: authorizations,
    isLoading,
    error,
    refetch,
  } = useQuery<Tables<"pre_authorizations">[]>({
    queryKey: ["preAuthorizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_authorizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Filter and search authorizations
  const filteredAuthorizations = useMemo(() => {
    if (!authorizations) return [];

    return authorizations.filter((auth) => {
      const matchesSearch = 
        auth.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.payer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.authorization_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || auth.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [authorizations, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!authorizations) return { total: 0, pending: 0, approved: 0, denied: 0, submitted: 0 };

    return authorizations.reduce(
      (acc, auth) => {
        acc.total++;
        switch (auth.status) {
          case "Pending":
            acc.pending++;
            break;
          case "Approved":
            acc.approved++;
            break;
          case "Denied":
            acc.denied++;
            break;
          case "Submitted":
            acc.submitted++;
            break;
        }
        return acc;
      },
      { total: 0, pending: 0, approved: 0, denied: 0, submitted: 0 }
    );
  }, [authorizations]);

  const getStatusColor = (status: Enums<"preauth_status">) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Denied":
        return "bg-red-100 text-red-800 border-red-200";
      case "Submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: Enums<"preauth_status">) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Pending":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Denied":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Submitted":
        return <Send className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const updateAuthStatus = async (authId: string, newStatus: Enums<"preauth_status">) => {
    try {
      const { error } = await supabase
        .from("pre_authorizations")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", authId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Authorization status changed to ${newStatus}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update authorization status",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PreauthFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("pre_authorizations")
        .insert({
          patient_name: data.patientName,
          service: data.service,
          payer: data.payer,
          requested_amount: data.requestedAmount ? parseFloat(data.requestedAmount) : null,
          notes: data.notes || null,
          status: "Pending",
        });

      if (error) throw error;

      toast({
        title: "Prior Authorization Created",
        description: "The authorization request has been submitted.",
      });

      form.reset();
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Creating Authorization",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (data: PreauthFormData) => {
    if (!editingAuth) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("pre_authorizations")
        .update({
          patient_name: data.patientName,
          service: data.service,
          payer: data.payer,
          requested_amount: data.requestedAmount ? parseFloat(data.requestedAmount) : null,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingAuth.id);

      if (error) throw error;

      toast({
        title: "Authorization Updated",
        description: "The authorization has been successfully updated.",
      });

      editForm.reset();
      setIsEditOpen(false);
      setEditingAuth(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Updating Authorization",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAuth = (auth: Tables<"pre_authorizations">) => {
    setEditingAuth(auth);
    editForm.reset({
      patientName: auth.patient_name || "",
      service: auth.service || "",
      payer: auth.payer || "",
      requestedAmount: auth.requested_amount?.toString() || "",
      notes: auth.notes || "",
    });
    setIsEditOpen(true);
  };

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600">Error Loading Prior Authorizations</h1>
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
            <h1 className="text-2xl sm:text-3xl font-bold">Prior Authorizations</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage insurance prior authorization requests
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Authorization</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Create Prior Authorization</DialogTitle>
              <DialogDescription className="text-sm">
                Submit a new prior authorization request to the insurance payer.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Patient Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient name" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Insurance Payer *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select payer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Blue Cross Blue Shield">Blue Cross Blue Shield</SelectItem>
                            <SelectItem value="Aetna">Aetna</SelectItem>
                            <SelectItem value="United Healthcare">United Healthcare</SelectItem>
                            <SelectItem value="Cigna">Cigna</SelectItem>
                            <SelectItem value="Medicare">Medicare</SelectItem>
                            <SelectItem value="Medicaid">Medicaid</SelectItem>
                            <SelectItem value="Humana">Humana</SelectItem>
                            <SelectItem value="Kaiser Permanente">Kaiser Permanente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Service/Procedure *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter service or procedure" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Requested Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          className="text-sm" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes or medical justification..."
                          className="resize-none text-sm"
                          {...field}
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
                    {loading ? "Creating..." : "Create Authorization"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.denied}</p>
                <p className="text-xs text-muted-foreground">Denied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Send className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.submitted}</p>
                <p className="text-xs text-muted-foreground">Submitted</p>
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
                placeholder="Search by patient, service, payer, or auth number..."
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Authorizations List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Prior Authorizations ({filteredAuthorizations.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredAuthorizations.length === 0 && !isLoading
              ? "No prior authorizations found."
              : "Click on an authorization to view details."}
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
          ) : filteredAuthorizations.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium">No authorizations found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first prior authorization request."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredAuthorizations.map((auth) => (
                <div
                  key={auth.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                  onClick={() => {
                    setSelectedAuth(auth);
                    setIsDetailsOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {auth.patient_name}
                        </h3>
                        {auth.authorization_number && (
                          <Badge variant="outline" className="text-xs self-start sm:self-auto">
                            {auth.authorization_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{auth.service}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="truncate">{auth.payer}</span>
                        </div>
                        {auth.requested_amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${auth.requested_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Created {format(parseISO(auth.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge className={`${getStatusColor(auth.status)} text-xs`}>
                      {getStatusIcon(auth.status)}
                      <span className="ml-1">{auth.status}</span>
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
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateAuthStatus(auth.id, "Submitted");
                        }}>
                          <Send className="h-4 w-4 mr-2" />
                          Mark Submitted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateAuthStatus(auth.id, "Approved");
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateAuthStatus(auth.id, "Denied");
                        }}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark Denied
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditAuth(auth);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Authorization
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Authorization
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

      {/* Authorization Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Prior Authorization Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this authorization request
            </DialogDescription>
          </DialogHeader>

          {selectedAuth && (
            <div className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Authorization Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Patient Name</label>
                    <p className="text-xs sm:text-sm font-medium">{selectedAuth.patient_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={`${getStatusColor(selectedAuth.status)} text-xs mt-1`}>
                      {getStatusIcon(selectedAuth.status)}
                      <span className="ml-1">{selectedAuth.status}</span>
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Service/Procedure</label>
                    <p className="text-xs sm:text-sm">{selectedAuth.service}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Insurance Payer</label>
                    <p className="text-xs sm:text-sm">{selectedAuth.payer}</p>
                  </div>
                  
                  {selectedAuth.authorization_number && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Authorization Number</label>
                      <p className="text-xs sm:text-sm font-mono">{selectedAuth.authorization_number}</p>
                    </div>
                  )}
                  
                  {selectedAuth.expiration_date && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Expiration Date</label>
                      <p className="text-xs sm:text-sm">{format(parseISO(selectedAuth.expiration_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Information */}
              {(selectedAuth.requested_amount || selectedAuth.approved_amount) && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Financial Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {selectedAuth.requested_amount && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Requested Amount</label>
                        <p className="text-xs sm:text-sm font-medium">${selectedAuth.requested_amount.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {selectedAuth.approved_amount && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Approved Amount</label>
                        <p className="text-xs sm:text-sm font-medium text-green-600">${selectedAuth.approved_amount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Timeline</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedAuth.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedAuth.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedAuth.notes && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Notes</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm">{selectedAuth.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t">
                <Button 
                  size="sm"
                  onClick={() => updateAuthStatus(selectedAuth.id, "Submitted")}
                  disabled={selectedAuth.status === "Submitted"}
                  className="w-full sm:w-auto"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mark Submitted
                </Button>
                <Button 
                  size="sm"
                  onClick={() => updateAuthStatus(selectedAuth.id, "Approved")}
                  disabled={selectedAuth.status === "Approved"}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Approved
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => updateAuthStatus(selectedAuth.id, "Denied")}
                  disabled={selectedAuth.status === "Denied"}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Denied
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  onClick={() => handleEditAuth(selectedAuth)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Authorization Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Prior Authorization</DialogTitle>
            <DialogDescription className="text-sm">
              Update the authorization request details.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Patient Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter patient name" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="payer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Insurance Payer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select payer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Blue Cross Blue Shield">Blue Cross Blue Shield</SelectItem>
                          <SelectItem value="Aetna">Aetna</SelectItem>
                          <SelectItem value="United Healthcare">United Healthcare</SelectItem>
                          <SelectItem value="Cigna">Cigna</SelectItem>
                          <SelectItem value="Medicare">Medicare</SelectItem>
                          <SelectItem value="Medicaid">Medicaid</SelectItem>
                          <SelectItem value="Humana">Humana</SelectItem>
                          <SelectItem value="Kaiser Permanente">Kaiser Permanente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Service/Procedure *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter service or procedure" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="requestedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Requested Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                        className="text-sm" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or medical justification..."
                        className="resize-none text-sm"
                        {...field}
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
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingAuth(null);
                    editForm.reset();
                  }}
                  disabled={loading}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto" size="sm">
                  {loading ? "Updating..." : "Update Authorization"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriorAuthorizationPage;