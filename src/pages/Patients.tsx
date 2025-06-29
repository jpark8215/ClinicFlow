import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
  Shield,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  SortAsc,
  SortDesc,
  Users,
  CalendarClock,
  FileCheck,
  X,
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PatientWithDetails = Tables<"patients"> & {
  appointments_count?: number;
  insurance_count?: number;
  documents_count?: number;
  latest_appointment?: string;
  latest_eligibility_check?: string;
};

type PatientDetailData = {
  appointments: Array<{
    id: string;
    appointment_time: string;
    status: string;
    appointment_type: string;
    provider_name?: string;
  }>;
  insurance: Array<{
    id: string;
    insurance_company: string;
    policy_number: string;
    effective_date?: string;
    expiration_date?: string;
    is_primary: boolean;
  }>;
  documents: Array<{
    id: string;
    document_name: string;
    document_type?: string;
    created_at: string;
    is_signed: boolean;
  }>;
  eligibility: Array<{
    id: string;
    payer_name: string;
    status: string;
    verification_date: string;
  }>;
};

const patientSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const PatientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name_asc");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [patientDetailData, setPatientDetailData] = useState<PatientDetailData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      phone: "",
      email: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    },
  });

  // Fetch patients with counts
  const {
    data: patients,
    isLoading,
    error,
    refetch,
  } = useQuery<PatientWithDetails[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      // First get all patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .order("full_name");
      
      if (patientsError) throw patientsError;
      
      // For each patient, get counts of related records
      const patientsWithCounts = await Promise.all(
        patientsData.map(async (patient) => {
          // Get appointment count
          const { count: appointmentsCount } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          // Get insurance count
          const { count: insuranceCount } = await supabase
            .from("patient_insurance")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          // Get documents count
          const { count: documentsCount } = await supabase
            .from("patient_documents")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          // Get latest appointment
          const { data: latestAppointment } = await supabase
            .from("appointments")
            .select("appointment_time")
            .eq("patient_id", patient.id)
            .order("appointment_time", { ascending: false })
            .limit(1);
          
          // Get latest eligibility check
          const { data: latestEligibility } = await supabase
            .from("insurance_eligibility")
            .select("verification_date")
            .eq("patient_id", patient.id)
            .order("verification_date", { ascending: false })
            .limit(1);
          
          return {
            ...patient,
            appointments_count: appointmentsCount || 0,
            insurance_count: insuranceCount || 0,
            documents_count: documentsCount || 0,
            latest_appointment: latestAppointment?.[0]?.appointment_time,
            latest_eligibility_check: latestEligibility?.[0]?.verification_date,
          };
        })
      );
      
      return patientsWithCounts;
    },
  });

  // Fetch patient details when a patient is selected
  const fetchPatientDetails = async (patientId: string) => {
    setDetailsLoading(true);
    try {
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_time,
          status,
          appointment_type,
          appointments_providers (
            providers (full_name)
          )
        `)
        .eq("patient_id", patientId)
        .order("appointment_time", { ascending: false })
        .limit(10);
      
      if (appointmentsError) throw appointmentsError;
      
      // Fetch insurance
      const { data: insuranceData, error: insuranceError } = await supabase
        .from("patient_insurance")
        .select("*")
        .eq("patient_id", patientId)
        .order("is_primary", { ascending: false });
      
      if (insuranceError) throw insuranceError;
      
      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      
      if (documentsError) throw documentsError;
      
      // Fetch eligibility checks
      const { data: eligibilityData, error: eligibilityError } = await supabase
        .from("insurance_eligibility")
        .select("*")
        .eq("patient_id", patientId)
        .order("verification_date", { ascending: false });
      
      if (eligibilityError) throw eligibilityError;
      
      // Format the appointments data
      const formattedAppointments = appointmentsData.map(apt => ({
        id: apt.id,
        appointment_time: apt.appointment_time,
        status: apt.status,
        appointment_type: apt.appointment_type,
        provider_name: apt.appointments_providers?.[0]?.providers?.full_name,
      }));
      
      setPatientDetailData({
        appointments: formattedAppointments,
        insurance: insuranceData,
        documents: documentsData,
        eligibility: eligibilityData,
      });
    } catch (error) {
      console.error("Error fetching patient details:", error);
      toast({
        title: "Error",
        description: "Failed to load patient details",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    // First apply search filter
    let filtered = patients.filter(patient => {
      const matchesSearch = !searchTerm || (
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return matchesSearch;
    });
    
    // Then apply type filter
    if (filterType !== "all") {
      switch (filterType) {
        case "with_appointments":
          filtered = filtered.filter(p => (p.appointments_count || 0) > 0);
          break;
        case "without_appointments":
          filtered = filtered.filter(p => !(p.appointments_count || 0) > 0);
          break;
        case "with_insurance":
          filtered = filtered.filter(p => (p.insurance_count || 0) > 0);
          break;
        case "without_insurance":
          filtered = filtered.filter(p => !(p.insurance_count || 0) > 0);
          break;
        case "with_documents":
          filtered = filtered.filter(p => (p.documents_count || 0) > 0);
          break;
        case "recent_activity":
          filtered = filtered.filter(p => p.latest_appointment || p.latest_eligibility_check);
          break;
      }
    }
    
    // Finally sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.full_name.localeCompare(b.full_name);
        case "name_desc":
          return b.full_name.localeCompare(a.full_name);
        case "recent_activity":
          const aLatest = a.latest_appointment || a.latest_eligibility_check || a.updated_at;
          const bLatest = b.latest_appointment || b.latest_eligibility_check || b.updated_at;
          return aLatest && bLatest ? new Date(bLatest).getTime() - new Date(aLatest).getTime() : 0;
        case "appointments_count":
          return (b.appointments_count || 0) - (a.appointments_count || 0);
        case "date_of_birth":
          if (!a.date_of_birth && !b.date_of_birth) return 0;
          if (!a.date_of_birth) return 1;
          if (!b.date_of_birth) return -1;
          return new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime();
        default:
          return 0;
      }
    });
  }, [patients, searchTerm, filterType, sortBy]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handlePatientSelect = (patient: PatientWithDetails) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
    fetchPatientDetails(patient.id);
  };

  const handleEditPatient = (patient: PatientWithDetails) => {
    setSelectedPatient(patient);
    
    // Populate form with patient data
    form.reset({
      fullName: patient.full_name,
      dateOfBirth: patient.date_of_birth || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      emergencyContactName: patient.emergency_contact_name || "",
      emergencyContactPhone: patient.emergency_contact_phone || "",
    });
    
    setIsEditOpen(true);
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      toast({
        title: "Patient Deleted",
        description: "The patient record has been successfully deleted.",
      });

      refetch();
      setIsDetailsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error Deleting Patient",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const onSubmitCreate = async (data: PatientFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .insert({
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
        });

      if (error) throw error;

      toast({
        title: "Patient Created",
        description: "The patient record has been successfully created.",
      });

      form.reset();
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Creating Patient",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitEdit = async (data: PatientFormData) => {
    if (!selectedPatient) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPatient.id);

      if (error) throw error;

      toast({
        title: "Patient Updated",
        description: "The patient record has been successfully updated.",
      });

      form.reset();
      setIsEditOpen(false);
      refetch();
      
      // If patient details are open, refresh the patient data
      if (isDetailsOpen) {
        const updatedPatient = {
          ...selectedPatient,
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
        };
        setSelectedPatient(updatedPatient);
      }
    } catch (error: any) {
      toast({
        title: "Error Updating Patient",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setSortBy("name_asc");
  };

  const hasActiveFilters = searchTerm || filterType !== "all";

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600">Error Loading Patients</h1>
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
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Patient List
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage patient records and information
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Patient</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Patient</DialogTitle>
              <DialogDescription className="text-sm">
                Create a new patient record in the system.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Basic Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient's full name" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} className="text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="patient@example.com" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter patient's address" 
                            {...field} 
                            className="resize-none text-sm" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-base font-medium">Emergency Contact</h3>
                  
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter emergency contact name" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    {loading ? "Creating..." : "Create Patient"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter patients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="with_appointments">With Appointments</SelectItem>
                  <SelectItem value="without_appointments">Without Appointments</SelectItem>
                  <SelectItem value="with_insurance">With Insurance</SelectItem>
                  <SelectItem value="without_insurance">Without Insurance</SelectItem>
                  <SelectItem value="with_documents">With Documents</SelectItem>
                  <SelectItem value="recent_activity">Recent Activity</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  {sortBy.includes("asc") ? (
                    <SortAsc className="h-4 w-4 mr-2" />
                  ) : (
                    <SortDesc className="h-4 w-4 mr-2" />
                  )}
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="recent_activity">Recent Activity</SelectItem>
                  <SelectItem value="appointments_count">Most Appointments</SelectItem>
                  <SelectItem value="date_of_birth">Date of Birth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchTerm}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                {filterType !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Filter: {filterType.replace(/_/g, " ")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setFilterType("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredPatients.length} of {patients?.length || 0} patients
              {hasActiveFilters && (
                <span className="ml-1">(filtered)</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Patients ({filteredPatients.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredPatients.length === 0 && !isLoading
              ? hasActiveFilters 
                ? "No patients match your current filters."
                : "No patients found in the system."
              : "Click on a patient to view details."}
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
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <User className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium">No patients found</h3>
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filter criteria."
                  : "Add your first patient to get started."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-3"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarFallback>
                        {getInitials(patient.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {patient.full_name}
                        </h3>
                        {patient.date_of_birth && (
                          <Badge variant="outline" className="text-xs self-start sm:self-auto">
                            {format(parseISO(patient.date_of_birth), "MMM d, yyyy")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        {patient.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{patient.phone}</span>
                          </div>
                        )}
                        {patient.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {patient.appointments_count || 0} appointment{patient.appointments_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>
                            {patient.documents_count || 0} document{patient.documents_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          <span>
                            {patient.insurance_count || 0} insurance{patient.insurance_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/schedule", { state: { patientId: patient.id } });
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="sr-only">Schedule</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/insurance-eligibility", { state: { patientId: patient.id } });
                        }}
                      >
                        <Shield className="h-4 w-4" />
                        <span className="sr-only">Verify Insurance</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/intake", { state: { patientId: patient.id } });
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="sr-only">Documents</span>
                      </Button>
                    </div>

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
                          handleEditPatient(patient);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Patient
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate("/schedule", { state: { patientId: patient.id } });
                        }}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Appointment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${patient.full_name}?`)) {
                              handleDeletePatient(patient.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Patient
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

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Patient Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this patient
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {getInitials(selectedPatient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{selectedPatient.full_name}</h2>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {selectedPatient.date_of_birth && (
                      <Badge variant="outline">
                        {format(parseISO(selectedPatient.date_of_birth), "MMM d, yyyy")}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedPatient.appointments_count || 0} appointments
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {selectedPatient.insurance_count || 0} insurance plans
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate("/schedule", { state: { patientId: selectedPatient.id } })}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/insurance-eligibility", { state: { patientId: selectedPatient.id } })}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Insurance
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/intake", { state: { patientId: selectedPatient.id } })}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Intake Task
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditPatient(selectedPatient)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Patient
                </Button>
              </div>

              {/* Tabs for different sections */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold">Contact Information</h3>
                      <div className="space-y-2">
                        {selectedPatient.phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Phone</p>
                              <p className="text-sm">{selectedPatient.phone}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPatient.email && (
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <p className="text-sm break-all">{selectedPatient.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPatient.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Address</p>
                              <p className="text-sm">{selectedPatient.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold">Emergency Contact</h3>
                      {selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone ? (
                        <div className="space-y-2">
                          {selectedPatient.emergency_contact_name && (
                            <div className="flex items-start gap-2">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Name</p>
                                <p className="text-sm">{selectedPatient.emergency_contact_name}</p>
                              </div>
                            </div>
                          )}
                          
                          {selectedPatient.emergency_contact_phone && (
                            <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm">{selectedPatient.emergency_contact_phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No emergency contact information provided.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-base font-semibold">Recent Activity</h3>
                    {detailsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Recent Appointments */}
                        {patientDetailData?.appointments && patientDetailData.appointments.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Recent Appointments</h4>
                            <div className="space-y-2">
                              {patientDetailData.appointments.slice(0, 3).map((apt) => (
                                <div key={apt.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {format(parseISO(apt.appointment_time), "MMM d, yyyy 'at' h:mm a")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {apt.appointment_type} {apt.provider_name && `with ${apt.provider_name}`}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={`text-xs ${
                                    apt.status === "Confirmed" ? "bg-green-100 text-green-800" :
                                    apt.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                    apt.status === "Cancelled" ? "bg-red-100 text-red-800" :
                                    apt.status === "No-Show" ? "bg-gray-100 text-gray-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {apt.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">No recent appointments found.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => navigate("/schedule", { state: { patientId: selectedPatient.id } })}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Appointment
                            </Button>
                          </div>
                        )}

                        {/* Recent Insurance Verification */}
                        {patientDetailData?.eligibility && patientDetailData.eligibility.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Recent Eligibility Checks</h4>
                            <div className="space-y-2">
                              {patientDetailData.eligibility.slice(0, 2).map((check) => (
                                <div key={check.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{check.payer_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Verified on {format(parseISO(check.verification_date), "MMM d, yyyy")}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={`text-xs ${
                                    check.status === "Eligible" ? "bg-green-100 text-green-800" :
                                    check.status === "Ineligible" ? "bg-red-100 text-red-800" :
                                    check.status === "Error" ? "bg-gray-100 text-gray-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {check.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Appointments Tab */}
                <TabsContent value="appointments" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Appointment History</h3>
                    <Button 
                      size="sm"
                      onClick={() => navigate("/schedule", { state: { patientId: selectedPatient.id } })}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule New
                    </Button>
                  </div>
                  
                  {detailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : patientDetailData?.appointments && patientDetailData.appointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientDetailData.appointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                              {format(parseISO(appointment.appointment_time), "MMM d, yyyy 'at' h:mm a")}
                            </TableCell>
                            <TableCell className="capitalize">{appointment.appointment_type}</TableCell>
                            <TableCell>{appointment.provider_name || "—"}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${
                                appointment.status === "Confirmed" ? "bg-green-100 text-green-800" :
                                appointment.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                appointment.status === "Cancelled" ? "bg-red-100 text-red-800" :
                                appointment.status === "No-Show" ? "bg-gray-100 text-gray-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {appointment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 bg-muted rounded-lg text-center">
                      <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-base font-medium">No Appointments Found</h4>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This patient doesn't have any appointments scheduled.
                      </p>
                      <Button 
                        onClick={() => navigate("/schedule", { state: { patientId: selectedPatient.id } })}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Appointment
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Insurance Information</h3>
                    <Button 
                      size="sm"
                      onClick={() => navigate("/insurance-eligibility", { state: { patientId: selectedPatient.id } })}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Eligibility
                    </Button>
                  </div>
                  
                  {detailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : patientDetailData?.insurance && patientDetailData.insurance.length > 0 ? (
                    <div className="space-y-4">
                      {patientDetailData.insurance.map((insurance) => (
                        <div key={insurance.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-base font-medium">{insurance.insurance_company}</h4>
                              <p className="text-sm text-muted-foreground">
                                Policy: {insurance.policy_number}
                              </p>
                            </div>
                            {insurance.is_primary && (
                              <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {insurance.effective_date && (
                              <div>
                                <p className="text-muted-foreground">Effective Date</p>
                                <p>{format(parseISO(insurance.effective_date), "MMM d, yyyy")}</p>
                              </div>
                            )}
                            
                            {insurance.expiration_date && (
                              <div>
                                <p className="text-muted-foreground">Expiration Date</p>
                                <p>{format(parseISO(insurance.expiration_date), "MMM d, yyyy")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-muted rounded-lg text-center">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-base font-medium">No Insurance Information</h4>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This patient doesn't have any insurance information on file.
                      </p>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Insurance
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Patient Documents</h3>
                    <Button 
                      size="sm"
                      onClick={() => navigate("/intake", { state: { patientId: selectedPatient.id } })}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                  
                  {detailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : patientDetailData?.documents && patientDetailData.documents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date Added</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientDetailData.documents.map((document) => (
                          <TableRow key={document.id}>
                            <TableCell className="font-medium">
                              {document.document_name}
                            </TableCell>
                            <TableCell>{document.document_type || "—"}</TableCell>
                            <TableCell>{format(parseISO(document.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              {document.is_signed ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Signed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Unsigned
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 bg-muted rounded-lg text-center">
                      <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-base font-medium">No Documents Found</h4>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This patient doesn't have any documents on file.
                      </p>
                      <Button 
                        onClick={() => navigate("/intake", { state: { patientId: selectedPatient.id } })}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Add Document
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Eligibility Tab */}
                <TabsContent value="eligibility" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Eligibility Verification History</h3>
                    <Button 
                      size="sm"
                      onClick={() => navigate("/insurance-eligibility", { state: { patientId: selectedPatient.id } })}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      New Verification
                    </Button>
                  </div>
                  
                  {detailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : patientDetailData?.eligibility && patientDetailData.eligibility.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insurance Payer</TableHead>
                          <TableHead>Verification Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientDetailData.eligibility.map((check) => (
                          <TableRow key={check.id}>
                            <TableCell className="font-medium">
                              {check.payer_name}
                            </TableCell>
                            <TableCell>{format(parseISO(check.verification_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${
                                check.status === "Eligible" ? "bg-green-100 text-green-800" :
                                check.status === "Ineligible" ? "bg-red-100 text-red-800" :
                                check.status === "Error" ? "bg-gray-100 text-gray-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {check.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 bg-muted rounded-lg text-center">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-base font-medium">No Eligibility Checks</h4>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        This patient doesn't have any insurance eligibility verifications.
                      </p>
                      <Button 
                        onClick={() => navigate("/insurance-eligibility", { state: { patientId: selectedPatient.id } })}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Eligibility
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Patient</DialogTitle>
            <DialogDescription className="text-sm">
              Update patient information
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter patient's full name" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="patient@example.com" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter patient's address" 
                          {...field} 
                          className="resize-none text-sm" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-base font-medium">Emergency Contact</h3>
                
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter emergency contact name" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsPage;