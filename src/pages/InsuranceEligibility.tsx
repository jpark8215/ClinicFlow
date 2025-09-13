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
  Shield,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  User,
  Building,
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

type EligibilityWithPatient = Tables<"insurance_eligibility"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email"> | null;
};

const eligibilitySchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  payerName: z.string().min(1, "Payer name is required"),
  details: z.string().optional(),
});

type EligibilityFormData = z.infer<typeof eligibilitySchema>;

const InsuranceEligibilityPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEligibility, setSelectedEligibility] = useState<EligibilityWithPatient | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EligibilityFormData>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      patientId: "",
      payerName: "",
      details: "",
    },
  });

  const editForm = useForm<EligibilityFormData>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      patientId: "",
      payerName: "",
      details: "",
    },
  });

  // Fetch insurance eligibility records
  const {
    data: eligibilityRecords,
    isLoading,
    error,
    refetch,
  } = useQuery<EligibilityWithPatient[]>({
    queryKey: ["insuranceEligibility"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_eligibility")
        .select(`
          *,
          patients (full_name, phone, email)
        `)
        .order("verification_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data as EligibilityWithPatient[];
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

  // Filter and search eligibility records
  const filteredRecords = useMemo(() => {
    if (!eligibilityRecords) return [];

    return eligibilityRecords.filter((record) => {
      const matchesSearch = 
        record.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.payer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.details?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [eligibilityRecords, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!eligibilityRecords) return { total: 0, eligible: 0, ineligible: 0, pending: 0, error: 0 };

    return eligibilityRecords.reduce(
      (acc, record) => {
        acc.total++;
        switch (record.status) {
          case "Eligible":
            acc.eligible++;
            break;
          case "Ineligible":
            acc.ineligible++;
            break;
          case "Pending":
            acc.pending++;
            break;
          case "Error":
            acc.error++;
            break;
        }
        return acc;
      },
      { total: 0, eligible: 0, ineligible: 0, pending: 0, error: 0 }
    );
  }, [eligibilityRecords]);

  const getStatusColor = (status: Enums<"eligibility_status">) => {
    switch (status) {
      case "Eligible":
        return "bg-green-100 text-green-800 border-green-200";
      case "Ineligible":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Error":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: Enums<"eligibility_status">) => {
    switch (status) {
      case "Eligible":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Ineligible":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Pending":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case "Error":
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const updateEligibilityStatus = async (recordId: string, newStatus: Enums<"eligibility_status">) => {
    try {
      const { error } = await supabase
        .from("insurance_eligibility")
        .update({ 
          status: newStatus,
          verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", recordId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Eligibility status changed to ${newStatus}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update eligibility status",
        variant: "destructive",
      });
    }
  };

  const reverifyEligibility = async (record: EligibilityWithPatient) => {
    try {
      const { error } = await supabase
        .from("insurance_eligibility")
        .update({ 
          status: "Pending",
          verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", record.id);

      if (error) throw error;

      toast({
        title: "Verification Started",
        description: `Re-verifying eligibility for ${record.patients?.full_name}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start verification",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: EligibilityFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("insurance_eligibility")
        .insert({
          patient_id: data.patientId,
          payer_name: data.payerName,
          status: "Pending",
          details: data.details || null,
          verification_date: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Eligibility Check Created",
        description: "The eligibility verification has been started.",
      });

      form.reset();
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Creating Eligibility Check",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (data: EligibilityFormData) => {
    if (!selectedEligibility) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("insurance_eligibility")
        .update({
          payer_name: data.payerName,
          details: data.details || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedEligibility.id);

      if (error) throw error;

      toast({
        title: "Details Updated",
        description: "The eligibility verification has been updated.",
      });

      editForm.reset();
      setIsEditOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Updating Details",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = (record: EligibilityWithPatient) => {
    setSelectedEligibility(record);
    editForm.setValue("patientId", record.patient_id);
    editForm.setValue("payerName", record.payer_name);
    editForm.setValue("details", record.details || "");
    setIsEditOpen(true);
  };

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600">Error Loading Insurance Eligibility</h1>
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
            <h1 className="text-2xl sm:text-3xl font-bold">Insurance Eligibility</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Verify patient insurance coverage and benefits
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Verification</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Create Eligibility Verification</DialogTitle>
              <DialogDescription className="text-sm">
                Start a new insurance eligibility verification for a patient.
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
                  name="payerName"
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

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Additional Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any specific coverage details or notes..."
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
                    {loading ? "Creating..." : "Start Verification"}
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
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
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
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.eligible}</p>
                <p className="text-xs text-muted-foreground">Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.ineligible}</p>
                <p className="text-xs text-muted-foreground">Ineligible</p>
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
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.error}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
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
                placeholder="Search by patient name, payer, or details..."
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
                <SelectItem value="Eligible">Eligible</SelectItem>
                <SelectItem value="Ineligible">Ineligible</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Records List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Eligibility Verifications ({filteredRecords.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredRecords.length === 0 && !isLoading
              ? "No eligibility verifications found."
              : "Click on a verification to view details."}
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
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium">No verifications found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first eligibility verification."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                  onClick={() => {
                    setSelectedEligibility(record);
                    setIsDetailsOpen(true);
                  }}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {record.patients?.full_name || "Unknown Patient"}
                        </h3>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{record.payer_name}</span>
                        </div>
                        {record.patients?.phone && (
                          <div className="flex items-center gap-1">
                            <span className="truncate">{record.patients.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Verified {format(parseISO(record.verification_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge className={`${getStatusColor(record.status)} text-xs`}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1">{record.status}</span>
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
                          reverifyEligibility(record);
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-verify
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateEligibilityStatus(record.id, "Eligible");
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Eligible
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateEligibilityStatus(record.id, "Ineligible");
                        }}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark Ineligible
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditDetails(record);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Record
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

      {/* Edit Eligibility Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Eligibility Details</DialogTitle>
            <DialogDescription className="text-sm">
              Update the eligibility verification information.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 sm:space-y-6">
              <FormField
                control={editForm.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Patient *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled>
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
                control={editForm.control}
                name="payerName"
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

              <FormField
                control={editForm.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Additional Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any specific coverage details or notes..."
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
                  onClick={() => setIsEditOpen(false)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto" size="sm">
                  {loading ? "Updating..." : "Update Details"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Eligibility Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Eligibility Verification Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this eligibility verification
            </DialogDescription>
          </DialogHeader>

          {selectedEligibility && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Patient Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Patient Name</label>
                    <p className="text-xs sm:text-sm font-medium">{selectedEligibility.patients?.full_name || "Unknown"}</p>
                  </div>
                  
                  {selectedEligibility.patients?.phone && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-xs sm:text-sm">{selectedEligibility.patients.phone}</p>
                    </div>
                  )}
                  
                  {selectedEligibility.patients?.email && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-xs sm:text-sm break-all">{selectedEligibility.patients.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Verification Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Insurance Payer</label>
                    <p className="text-xs sm:text-sm font-medium">{selectedEligibility.payer_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={`${getStatusColor(selectedEligibility.status)} text-xs mt-1`}>
                      {getStatusIcon(selectedEligibility.status)}
                      <span className="ml-1">{selectedEligibility.status}</span>
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Verification Date</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedEligibility.verification_date), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-xs sm:text-sm">{format(parseISO(selectedEligibility.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </div>

              {/* Coverage Details */}
              {selectedEligibility.details && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Coverage Details</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm">{selectedEligibility.details}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t">
                <Button 
                  size="sm"
                  onClick={() => reverifyEligibility(selectedEligibility)}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-verify
                </Button>
                <Button 
                  size="sm"
                  onClick={() => updateEligibilityStatus(selectedEligibility.id, "Eligible")}
                  disabled={selectedEligibility.status === "Eligible"}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Eligible
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => updateEligibilityStatus(selectedEligibility.id, "Ineligible")}
                  disabled={selectedEligibility.status === "Ineligible"}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Ineligible
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  onClick={() => handleEditDetails(selectedEligibility)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceEligibilityPage;