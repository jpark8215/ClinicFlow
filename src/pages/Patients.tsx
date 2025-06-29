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
  Clock,
  UserPlus,
  CalendarDays,
  Cake,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  UserCog,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInYears } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PatientWithDetails = Tables<"patients"> & {
  appointments_count?: number;
  insurance_count?: number;
  documents_count?: number;
  latest_appointment?: string;
  insurance?: Array<{
    id: string;
    insurance_company: string;
    policy_number: string;
    is_primary: boolean;
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
  const [sortBy, setSortBy] = useState<string>("name");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 10;

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
    data: patientsData,
    isLoading,
    error,
    refetch,
  } = useQuery<PatientWithDetails[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      // First get all patients
      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .order("full_name");
      
      if (patientsError) throw new Error(patientsError.message);
      
      // For each patient, get counts of related records
      const patientsWithDetails = await Promise.all(
        patients.map(async (patient) => {
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
            .limit(1)
            .single();
          
          // Get insurance information
          const { data: insurance } = await supabase
            .from("patient_insurance")
            .select("id, insurance_company, policy_number, is_primary")
            .eq("patient_id", patient.id);
          
          return {
            ...patient,
            appointments_count: appointmentsCount || 0,
            insurance_count: insuranceCount || 0,
            documents_count: documentsCount || 0,
            latest_appointment: latestAppointment?.appointment_time,
            insurance: insurance || [],
          };
        })
      );
      
      return patientsWithDetails;
    },
  });

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    if (!patientsData) return [];

    let filtered = patientsData.filter((patient) => {
      const matchesSearch = !searchTerm || (
        patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      let matchesFilter = true;
      switch (filterBy) {
        case "recent":
          matchesFilter = !!patient.latest_appointment;
          break;
        case "noInsurance":
          matchesFilter = (patient.insurance_count || 0) === 0;
          break;
        case "withInsurance":
          matchesFilter = (patient.insurance_count || 0) > 0;
          break;
        case "withDocuments":
          matchesFilter = (patient.documents_count || 0) > 0;
          break;
        case "withAppointments":
          matchesFilter = (patient.appointments_count || 0) > 0;
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort patients
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "recent":
          if (!a.latest_appointment && !b.latest_appointment) return 0;
          if (!a.latest_appointment) return 1;
          if (!b.latest_appointment) return -1;
          return new Date(b.latest_appointment).getTime() - new Date(a.latest_appointment).getTime();
        case "appointments":
          return (b.appointments_count || 0) - (a.appointments_count || 0);
        case "age":
          if (!a.date_of_birth && !b.date_of_birth) return 0;
          if (!a.date_of_birth) return 1;
          if (!b.date_of_birth) return -1;
          return new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime();
        default:
          return a.full_name.localeCompare(b.full_name);
      }
    });

    return filtered;
  }, [patientsData, searchTerm, filterBy, sortBy]);

  // Pagination
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPatients.slice(startIndex, endIndex);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    try {
      const birthDate = parseISO(dateOfBirth);
      return differenceInYears(new Date(), birthDate);
    } catch (error) {
      return null;
    }
  };

  const onSubmit = async (data: PatientFormData) => {
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("name");
  };

  const hasActiveFilters = searchTerm || filterBy !== "all" || sortBy !== "name";

  // Fetch patient details for the selected patient
  const fetchPatientDetails = async (patientId: string) => {
    try {
      // Get patient appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          appointments_providers (
            providers (full_name, specialty)
          )
        `)
        .eq("patient_id", patientId)
        .order("appointment_time", { ascending: false });
      
      if (appointmentsError) throw appointmentsError;
      
      // Get patient insurance
      const { data: insurance, error: insuranceError } = await supabase
        .from("patient_insurance")
        .select("*")
        .eq("patient_id", patientId);
      
      if (insuranceError) throw insuranceError;
      
      // Get patient documents
      const { data: documents, error: documentsError } = await supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId);
      
      if (documentsError) throw documentsError;
      
      // Get eligibility checks
      const { data: eligibility, error: eligibilityError } = await supabase
        .from("insurance_eligibility")
        .select("*")
        .eq("patient_id", patientId)
        .order("verification_date", { ascending: false });
      
      if (eligibilityError) throw eligibilityError;
      
      return {
        appointments: appointments || [],
        insurance: insurance || [],
        documents: documents || [],
        eligibility: eligibility || [],
      };
    } catch (error) {
      console.error("Error fetching patient details:", error);
      toast({
        title: "Error",
        description: "Failed to load patient details",
        variant: "destructive",
      });
      return {
        appointments: [],
        insurance: [],
        documents: [],
        eligibility: [],
      };
    }
  };

  const handleViewPatient = async (patient: PatientWithDetails) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
    
    // Fetch additional patient details
    const details = await fetchPatientDetails(patient.id);
    
    // Update the selected patient with the fetched details
    setSelectedPatient(prev => {
      if (!prev) return null;
      return {
        ...prev,
        details,
      };
    });
  };

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
              Patient Management
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Comprehensive patient records and information
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Patient</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Patient</DialogTitle>
              <DialogDescription className="text-sm">
                Create a new patient record with contact information.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
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
                          <Textarea placeholder="Enter patient's address" {...field} className="text-sm" />
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{patientsData?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">
                  {patientsData?.filter(p => p.appointments_count && p.appointments_count > 0).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">With Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">
                  {patientsData?.filter(p => p.insurance_count && p.insurance_count > 0).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">With Insurance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">
                  {patientsData?.filter(p => p.documents_count && p.documents_count > 0).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">With Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
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
              
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter patients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="recent">Recent Visits</SelectItem>
                  <SelectItem value="withInsurance">With Insurance</SelectItem>
                  <SelectItem value="noInsurance">No Insurance</SelectItem>
                  <SelectItem value="withDocuments">With Documents</SelectItem>
                  <SelectItem value="withAppointments">With Appointments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <UserCog className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="recent">Recent Activity</SelectItem>
                  <SelectItem value="appointments">Most Appointments</SelectItem>
                  <SelectItem value="age">Age</SelectItem>
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
                
                {filterBy !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Filter: {filterBy === "recent" ? "Recent Visits" : 
                            filterBy === "withInsurance" ? "With Insurance" :
                            filterBy === "noInsurance" ? "No Insurance" :
                            filterBy === "withDocuments" ? "With Documents" :
                            filterBy === "withAppointments" ? "With Appointments" : filterBy}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setFilterBy("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                {sortBy !== "name" && (
                  <Badge variant="secondary" className="text-xs">
                    Sort: {sortBy === "recent" ? "Recent Activity" : 
                          sortBy === "appointments" ? "Most Appointments" :
                          sortBy === "age" ? "Age" : sortBy}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setSortBy("name")}
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
              Showing {paginatedPatients.length} of {filteredPatients.length} patients
              {hasActiveFilters && (
                <span className="ml-1">(filtered from {patientsData?.length || 0} total)</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Patient Records</CardTitle>
          <CardDescription className="text-sm">
            {filteredPatients.length === 0 && !isLoading
              ? hasActiveFilters 
                ? "No patients match your current filters."
                : "No patients found in the system."
              : "Click on a patient to view complete details."}
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
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
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
              {paginatedPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                  onClick={() => handleViewPatient(patient)}
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
                            <Cake className="h-3 w-3 mr-1" />
                            {getAge(patient.date_of_birth)} years
                          </Badge>
                        )}
                        {(patient.insurance_count || 0) > 0 && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs self-start sm:self-auto">
                            <Shield className="h-3 w-3 mr-1" />
                            Insured
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                        {patient.latest_appointment && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Last visit: {format(parseISO(patient.latest_appointment), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>{patient.appointments_count || 0} appointments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{patient.documents_count || 0} documents</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
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
                          navigate("/schedule");
                        }}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Appointment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate("/insurance-eligibility");
                        }}>
                          <Shield className="h-4 w-4 mr-2" />
                          Verify Insurance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate("/intake");
                        }}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Intake Task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleViewPatient(patient);
                        }}>
                          <User className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Patient
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => e.stopPropagation()}
                          className="text-red-600"
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

          {/* Pagination */}
          {filteredPatients.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    
                    // Show first page, last page, and pages around current page
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    // Show ellipsis for skipped pages
                    if (page === 2 || page === totalPages - 1) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
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
              Complete patient information and medical history
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {getInitials(selectedPatient.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl font-bold">{selectedPatient.full_name}</h2>
                    {selectedPatient.date_of_birth && (
                      <Badge variant="outline" className="text-sm self-start sm:self-auto">
                        <Cake className="h-3 w-3 mr-1" />
                        {getAge(selectedPatient.date_of_birth)} years old
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {selectedPatient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedPatient.phone}</span>
                      </div>
                    )}
                    
                    {selectedPatient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedPatient.email}</span>
                      </div>
                    )}
                    
                    {selectedPatient.address && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedPatient.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Patient Tabs */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Appointments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedPatient.appointments_count || 0}</div>
                        <p className="text-sm text-muted-foreground">Total appointments</p>
                        
                        {selectedPatient.latest_appointment && (
                          <div className="mt-2 pt-2 border-t text-sm">
                            <p className="text-muted-foreground">Last visit:</p>
                            <p className="font-medium">
                              {format(parseISO(selectedPatient.latest_appointment), "MMMM d, yyyy")}
                            </p>
                          </div>
                        )}
                        
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-2 p-0 h-auto"
                          onClick={() => setActiveTab("appointments")}
                        >
                          View appointment history
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          Insurance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedPatient.insurance_count || 0}</div>
                        <p className="text-sm text-muted-foreground">Insurance policies</p>
                        
                        {selectedPatient.insurance && selectedPatient.insurance.length > 0 && (
                          <div className="mt-2 pt-2 border-t text-sm">
                            <p className="text-muted-foreground">Primary insurance:</p>
                            <p className="font-medium truncate">
                              {selectedPatient.insurance.find(i => i.is_primary)?.insurance_company || 
                               selectedPatient.insurance[0].insurance_company}
                            </p>
                          </div>
                        )}
                        
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-2 p-0 h-auto"
                          onClick={() => setActiveTab("insurance")}
                        >
                          View insurance details
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-orange-600" />
                          Documents
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedPatient.documents_count || 0}</div>
                        <p className="text-sm text-muted-foreground">Patient documents</p>
                        
                        <div className="mt-2 pt-2 border-t text-sm">
                          <p className="text-muted-foreground">Document types:</p>
                          <p className="font-medium">
                            {selectedPatient.documents_count ? "Medical records, forms, etc." : "No documents"}
                          </p>
                        </div>
                        
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-2 p-0 h-auto"
                          onClick={() => setActiveTab("documents")}
                        >
                          View document library
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-medium">{selectedPatient.full_name}</p>
                        </div>
                        
                        {selectedPatient.date_of_birth && (
                          <div>
                            <p className="text-sm text-muted-foreground">Date of Birth</p>
                            <p className="font-medium">
                              {format(parseISO(selectedPatient.date_of_birth), "MMMM d, yyyy")} 
                              <span className="text-muted-foreground ml-2">
                                ({getAge(selectedPatient.date_of_birth)} years old)
                              </span>
                            </p>
                          </div>
                        )}
                        
                        {selectedPatient.phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Phone Number</p>
                            <p className="font-medium">{selectedPatient.phone}</p>
                          </div>
                        )}
                        
                        {selectedPatient.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email Address</p>
                            <p className="font-medium">{selectedPatient.email}</p>
                          </div>
                        )}
                        
                        {selectedPatient.address && (
                          <div className="sm:col-span-2">
                            <p className="text-sm text-muted-foreground">Address</p>
                            <p className="font-medium">{selectedPatient.address}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Emergency Contact */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedPatient.emergency_contact_name && (
                            <div>
                              <p className="text-sm text-muted-foreground">Contact Name</p>
                              <p className="font-medium">{selectedPatient.emergency_contact_name}</p>
                            </div>
                          )}
                          
                          {selectedPatient.emergency_contact_phone && (
                            <div>
                              <p className="text-sm text-muted-foreground">Contact Phone</p>
                              <p className="font-medium">{selectedPatient.emergency_contact_phone}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No emergency contact information provided.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Appointment
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Verify Insurance
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Intake Task
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit Patient
                    </Button>
                  </div>
                </TabsContent>

                {/* Appointments Tab */}
                <TabsContent value="appointments" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Appointment History
                        </CardTitle>
                        <Button size="sm" className="flex items-center gap-2 self-start sm:self-auto">
                          <Plus className="h-4 w-4" />
                          New Appointment
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.details?.appointments && selectedPatient.details.appointments.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedPatient.details.appointments.map((appointment) => (
                              <TableRow key={appointment.id}>
                                <TableCell className="font-medium">
                                  {format(parseISO(appointment.appointment_time), "MMM d, yyyy h:mm a")}
                                </TableCell>
                                <TableCell className="capitalize">
                                  {appointment.appointment_type || "consultation"}
                                </TableCell>
                                <TableCell>
                                  {appointment.appointments_providers?.[0]?.providers?.full_name || "No provider"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`
                                    ${appointment.status === "Confirmed" ? "bg-green-100 text-green-800" : 
                                      appointment.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                      appointment.status === "Cancelled" ? "bg-red-100 text-red-800" :
                                      appointment.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                      appointment.status === "No-Show" ? "bg-gray-100 text-gray-800" :
                                      "bg-gray-100 text-gray-800"}
                                  `}>
                                    {appointment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-medium">No appointments found</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This patient doesn't have any appointments yet.
                          </p>
                          <Button size="sm" className="flex items-center gap-2 mx-auto">
                            <Plus className="h-4 w-4" />
                            Schedule First Appointment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          Insurance Information
                        </CardTitle>
                        <Button size="sm" className="flex items-center gap-2 self-start sm:self-auto">
                          <Plus className="h-4 w-4" />
                          Add Insurance
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.details?.insurance && selectedPatient.details.insurance.length > 0 ? (
                        <div className="space-y-4">
                          {selectedPatient.details.insurance.map((insurance) => (
                            <div key={insurance.id} className="p-4 border rounded-lg">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-5 w-5 text-purple-600" />
                                  <h3 className="font-medium">{insurance.insurance_company}</h3>
                                  {insurance.is_primary && (
                                    <Badge className="bg-purple-100 text-purple-800">Primary</Badge>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Policy Number</p>
                                  <p className="font-medium">{insurance.policy_number}</p>
                                </div>
                                
                                {insurance.group_number && (
                                  <div>
                                    <p className="text-muted-foreground">Group Number</p>
                                    <p className="font-medium">{insurance.group_number}</p>
                                  </div>
                                )}
                                
                                {insurance.subscriber_name && (
                                  <div>
                                    <p className="text-muted-foreground">Subscriber Name</p>
                                    <p className="font-medium">{insurance.subscriber_name}</p>
                                  </div>
                                )}
                                
                                {insurance.relationship_to_subscriber && (
                                  <div>
                                    <p className="text-muted-foreground">Relationship to Subscriber</p>
                                    <p className="font-medium">{insurance.relationship_to_subscriber}</p>
                                  </div>
                                )}
                                
                                {insurance.effective_date && (
                                  <div>
                                    <p className="text-muted-foreground">Effective Date</p>
                                    <p className="font-medium">{format(parseISO(insurance.effective_date), "MMM d, yyyy")}</p>
                                  </div>
                                )}
                                
                                {insurance.expiration_date && (
                                  <div>
                                    <p className="text-muted-foreground">Expiration Date</p>
                                    <p className="font-medium">{format(parseISO(insurance.expiration_date), "MMM d, yyyy")}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-3 pt-3 border-t flex gap-2">
                                <Button size="sm" variant="outline" className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Verify Eligibility
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-medium">No insurance information</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This patient doesn't have any insurance records yet.
                          </p>
                          <Button size="sm" className="flex items-center gap-2 mx-auto">
                            <Plus className="h-4 w-4" />
                            Add Insurance Information
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-orange-600" />
                          Patient Documents
                        </CardTitle>
                        <Button size="sm" className="flex items-center gap-2 self-start sm:self-auto">
                          <Plus className="h-4 w-4" />
                          Add Document
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.details?.documents && selectedPatient.details.documents.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Document Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Date Added</TableHead>
                              <TableHead>Signed</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedPatient.details.documents.map((document) => (
                              <TableRow key={document.id}>
                                <TableCell className="font-medium">
                                  {document.document_name}
                                </TableCell>
                                <TableCell>
                                  {document.document_type || "General"}
                                </TableCell>
                                <TableCell>
                                  {document.created_at ? format(parseISO(document.created_at), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {document.is_signed ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Signed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Unsigned
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {document.document_url && (
                                      <Button variant="ghost" size="sm" onClick={() => window.open(document.document_url, '_blank')}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-medium">No documents found</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This patient doesn't have any documents yet.
                          </p>
                          <Button size="sm" className="flex items-center gap-2 mx-auto">
                            <Plus className="h-4 w-4" />
                            Upload First Document
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Eligibility Tab */}
                <TabsContent value="eligibility" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          Insurance Eligibility Checks
                        </CardTitle>
                        <Button size="sm" className="flex items-center gap-2 self-start sm:self-auto">
                          <Plus className="h-4 w-4" />
                          New Eligibility Check
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.details?.eligibility && selectedPatient.details.eligibility.length > 0 ? (
                        <div className="space-y-4">
                          {selectedPatient.details.eligibility.map((check) => (
                            <div key={check.id} className="p-4 border rounded-lg">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-5 w-5 text-green-600" />
                                  <h3 className="font-medium">{check.payer_name}</h3>
                                  <Badge className={`
                                    ${check.status === "Eligible" ? "bg-green-100 text-green-800" : 
                                      check.status === "Ineligible" ? "bg-red-100 text-red-800" :
                                      check.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-gray-100 text-gray-800"}
                                  `}>
                                    {check.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Verified: {format(parseISO(check.verification_date), "MMM d, yyyy")}
                                </div>
                              </div>
                              
                              {check.details && (
                                <div className="p-3 bg-muted rounded-lg text-sm mb-3">
                                  <p className="font-medium mb-1">Coverage Details:</p>
                                  <p>{check.details}</p>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4" />
                                  Re-verify
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-medium">No eligibility checks</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This patient doesn't have any insurance eligibility verifications yet.
                          </p>
                          <Button size="sm" className="flex items-center gap-2 mx-auto">
                            <Plus className="h-4 w-4" />
                            Verify Insurance Eligibility
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsPage;