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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Shield,
  Activity,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Heart,
  Stethoscope,
  Pill,
  ClipboardList,
  Download,
  Upload,
  Eye,
  Bell,
  Settings,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Brain,
  RefreshCw,
  Star,
  Award,
  Calendar as CalendarIcon,
  Timer,
  DollarSign,
  CreditCard,
  Building,
  IdCard,
  ContactIcon,
  UserPlus,
  History,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInYears, subDays, addDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";

type PatientWithDetails = Tables<"patients"> & {
  patient_insurance: Tables<"patient_insurance">[];
  appointments: Array<{
    id: string;
    appointment_time: string;
    status: string;
    appointment_type: string;
    no_show_risk: number | null;
  }>;
  insurance_eligibility: Array<{
    id: string;
    payer_name: string;
    status: string;
    verification_date: string;
  }>;
  intake_tasks: Array<{
    id: string;
    task_description: string;
    status: string;
    created_at: string;
  }>;
  pre_authorizations: Array<{
    id: string;
    service: string;
    status: string;
    created_at: string;
  }>;
};

const patientSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const PatientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
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

  // Fetch patients with related data
  const {
    data: patients,
    isLoading,
    error,
    refetch,
  } = useQuery<PatientWithDetails[]>({
    queryKey: ["patientsWithDetails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select(`
          *,
          patient_insurance (*),
          appointments (id, appointment_time, status, appointment_type, no_show_risk),
          insurance_eligibility (id, payer_name, status, verification_date),
          intake_tasks (id, task_description, status, created_at),
          pre_authorizations (id, service, status, created_at)
        `)
        .order("full_name", { ascending: true });

      if (error) throw new Error(error.message);
      return data as PatientWithDetails[];
    },
  });

  // Filter and sort patients
  const filteredAndSortedPatients = useMemo(() => {
    if (!patients) return [];

    let filtered = patients.filter((patient) => {
      const matchesSearch = 
        patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm);

      const matchesFilter = (() => {
        switch (filterBy) {
          case "recent":
            return patient.appointments.some(apt => 
              new Date(apt.appointment_time) > subDays(new Date(), 30)
            );
          case "high-risk":
            return patient.appointments.some(apt => (apt.no_show_risk || 0) > 0.6);
          case "no-insurance":
            return patient.patient_insurance.length === 0;
          case "pending-tasks":
            return patient.intake_tasks.some(task => task.status !== "Complete");
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    // Sort patients
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "recent":
          const aRecent = Math.max(...a.appointments.map(apt => new Date(apt.appointment_time).getTime()), 0);
          const bRecent = Math.max(...b.appointments.map(apt => new Date(apt.appointment_time).getTime()), 0);
          return bRecent - aRecent;
        case "age":
          const aAge = a.date_of_birth ? differenceInYears(new Date(), new Date(a.date_of_birth)) : 0;
          const bAge = b.date_of_birth ? differenceInYears(new Date(), new Date(b.date_of_birth)) : 0;
          return bAge - aAge;
        case "appointments":
          return b.appointments.length - a.appointments.length;
        default:
          return 0;
      }
    });

    return filtered;
  }, [patients, searchTerm, sortBy, filterBy]);

  // Patient statistics
  const patientStats = useMemo(() => {
    if (!patients) return null;

    const totalPatients = patients.length;
    const recentPatients = patients.filter(p => 
      p.appointments.some(apt => new Date(apt.appointment_time) > subDays(new Date(), 30))
    ).length;
    const highRiskPatients = patients.filter(p => 
      p.appointments.some(apt => (apt.no_show_risk || 0) > 0.6)
    ).length;
    const uninsuredPatients = patients.filter(p => p.patient_insurance.length === 0).length;
    const pendingTasks = patients.reduce((sum, p) => 
      sum + p.intake_tasks.filter(task => task.status !== "Complete").length, 0
    );
    const averageAge = patients.filter(p => p.date_of_birth).length > 0
      ? patients
          .filter(p => p.date_of_birth)
          .reduce((sum, p) => sum + differenceInYears(new Date(), new Date(p.date_of_birth!)), 0) / 
        patients.filter(p => p.date_of_birth).length
      : 0;

    return {
      totalPatients,
      recentPatients,
      highRiskPatients,
      uninsuredPatients,
      pendingTasks,
      averageAge: Math.round(averageAge),
    };
  }, [patients]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getPatientRiskLevel = (patient: PatientWithDetails) => {
    const highRiskAppointments = patient.appointments.filter(apt => (apt.no_show_risk || 0) > 0.6).length;
    const totalAppointments = patient.appointments.length;
    
    if (totalAppointments === 0) return { level: "Unknown", color: "text-gray-600", bgColor: "bg-gray-50" };
    
    const riskRatio = highRiskAppointments / totalAppointments;
    if (riskRatio > 0.5) return { level: "High", color: "text-red-600", bgColor: "bg-red-50" };
    if (riskRatio > 0.2) return { level: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { level: "Low", color: "text-green-600", bgColor: "bg-green-50" };
  };

  const getInsuranceStatus = (patient: PatientWithDetails) => {
    if (patient.patient_insurance.length === 0) {
      return { status: "Uninsured", color: "text-red-600", bgColor: "bg-red-50" };
    }
    
    const primaryInsurance = patient.patient_insurance.find(ins => ins.is_primary);
    if (primaryInsurance) {
      return { status: "Insured", color: "text-green-600", bgColor: "bg-green-50" };
    }
    
    return { status: "Partial", color: "text-yellow-600", bgColor: "bg-yellow-50" };
  };

  const onSubmit = async (data: PatientFormData) => {
    setLoading(true);
    try {
      const patientData = {
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        emergency_contact_name: data.emergencyContactName || null,
        emergency_contact_phone: data.emergencyContactPhone || null,
      };

      if (isEditOpen && selectedPatient) {
        const { error } = await supabase
          .from("patients")
          .update(patientData)
          .eq("id", selectedPatient.id);

        if (error) throw error;

        toast({
          title: "Patient Updated",
          description: "Patient information has been successfully updated.",
        });
      } else {
        const { error } = await supabase
          .from("patients")
          .insert(patientData);

        if (error) throw error;

        toast({
          title: "Patient Created",
          description: "New patient has been successfully added.",
        });
      }

      form.reset();
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setSelectedPatient(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient: PatientWithDetails) => {
    setSelectedPatient(patient);
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

  const handleDelete = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully removed.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete patient.",
        variant: "destructive",
      });
    }
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
              Comprehensive patient records and healthcare management
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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
                  Enter patient information to create a new record.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Basic Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} className="text-sm" />
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
                              <Input placeholder="(123) 456-7890" {...field} className="text-sm" />
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
                              placeholder="Enter full address" 
                              {...field} 
                              className="text-sm resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">Emergency Contact</h3>
                    
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Emergency contact name" {...field} className="text-sm" />
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
                            <Input placeholder="(123) 456-7890" {...field} className="text-sm" />
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
                      {loading ? "Saving..." : "Save Patient"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {patientStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.totalPatients}</p>
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
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.recentPatients}</p>
                  <p className="text-xs text-muted-foreground">Recent Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.highRiskPatients}</p>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.uninsuredPatients}</p>
                  <p className="text-xs text-muted-foreground">Uninsured</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.pendingTasks}</p>
                  <p className="text-xs text-muted-foreground">Pending Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{patientStats.averageAge}</p>
                  <p className="text-xs text-muted-foreground">Avg. Age</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="age">Age</SelectItem>
                <SelectItem value="appointments">Most Appointments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="recent">Recent Visits</SelectItem>
                <SelectItem value="high-risk">High Risk</SelectItem>
                <SelectItem value="no-insurance">No Insurance</SelectItem>
                <SelectItem value="pending-tasks">Pending Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Patients ({filteredAndSortedPatients.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredAndSortedPatients.length === 0 && !isLoading
              ? "No patients found."
              : "Click on a patient to view detailed information."}
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
          ) : filteredAndSortedPatients.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium">No patients found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || filterBy !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Add your first patient to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredAndSortedPatients.map((patient) => {
                const riskLevel = getPatientRiskLevel(patient);
                const insuranceStatus = getInsuranceStatus(patient);
                const age = patient.date_of_birth 
                  ? differenceInYears(new Date(), new Date(patient.date_of_birth))
                  : null;
                const pendingTasks = patient.intake_tasks.filter(task => task.status !== "Complete").length;
                const recentAppointment = patient.appointments.length > 0
                  ? patient.appointments.sort((a, b) => 
                      new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime()
                    )[0]
                  : null;
                
                return (
                  <div
                    key={patient.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3 sm:gap-4"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setIsDetailsOpen(true);
                    }}
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
                          <div className="flex items-center gap-1">
                            {age !== null && (
                              <Badge variant="outline" className="text-xs">
                                {age} years
                              </Badge>
                            )}
                            <Badge className={`${riskLevel.bgColor} ${riskLevel.color} text-xs`}>
                              {riskLevel.level} Risk
                            </Badge>
                            <Badge className={`${insuranceStatus.bgColor} ${insuranceStatus.color} text-xs`}>
                              {insuranceStatus.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{patient.phone}</span>
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
                          {recentAppointment && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Last visit: {format(parseISO(recentAppointment.appointment_time), "MMM d, yyyy")}
                              </span>
                            </div>
                          )}
                          {pendingTasks > 0 && (
                            <div className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              <span>{pendingTasks} pending tasks</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {patient.appointments.length} appointments
                        </Badge>
                        {patient.patient_insurance.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {patient.patient_insurance.length} insurance
                          </Badge>
                        )}
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
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Create Intake Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(patient);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Patient
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(patient.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Patient
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
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
              Comprehensive patient information and medical history
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {getInitials(selectedPatient.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPatient.full_name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {selectedPatient.date_of_birth && (
                        <Badge variant="outline" className="text-xs">
                          {differenceInYears(new Date(), new Date(selectedPatient.date_of_birth))} years
                        </Badge>
                      )}
                      <Badge className={`${getPatientRiskLevel(selectedPatient).bgColor} ${getPatientRiskLevel(selectedPatient).color} text-xs`}>
                        {getPatientRiskLevel(selectedPatient).level} Risk
                      </Badge>
                      <Badge className={`${getInsuranceStatus(selectedPatient).bgColor} ${getInsuranceStatus(selectedPatient).color} text-xs`}>
                        {getInsuranceStatus(selectedPatient).status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleEdit(selectedPatient)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/schedule")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </div>

              {/* Patient Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
                  <TabsTrigger value="insurance" className="text-xs sm:text-sm">Insurance</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                  <TabsTrigger value="authorizations" className="text-xs sm:text-sm">Authorizations</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Information */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Phone</p>
                              <p className="text-sm">{selectedPatient.phone || "Not provided"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <p className="text-sm break-all">{selectedPatient.email || "Not provided"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Address</p>
                              <p className="text-sm">{selectedPatient.address || "Not provided"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Emergency Contact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Name</p>
                              <p className="text-sm">{selectedPatient.emergency_contact_name || "Not provided"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Phone</p>
                              <p className="text-sm">{selectedPatient.emergency_contact_phone || "Not provided"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedPatient.appointments.length === 0 &&
                           selectedPatient.intake_tasks.length === 0 &&
                           selectedPatient.insurance_eligibility.length === 0 &&
                           selectedPatient.pre_authorizations.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No recent activity found for this patient.
                            </p>
                          ) : (
                            <>
                              {/* Recent Appointments */}
                              {selectedPatient.appointments
                                .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
                                .slice(0, 3)
                                .map(appointment => (
                                  <div key={appointment.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {format(parseISO(appointment.appointment_time), "MMM d, yyyy 'at' h:mm a")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {appointment.appointment_type} • {appointment.status}
                                      </p>
                                    </div>
                                    <Badge className={`text-xs ${getStatusColor(appointment.status as any)}`}>
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                ))}
                              
                              {/* Recent Intake Tasks */}
                              {selectedPatient.intake_tasks
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .slice(0, 2)
                                .map(task => (
                                  <div key={task.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                      <ClipboardList className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{task.task_description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Created on {format(parseISO(task.created_at), "MMM d, yyyy")}
                                      </p>
                                    </div>
                                    <Badge className="text-xs bg-purple-100 text-purple-800">
                                      {task.status}
                                    </Badge>
                                  </div>
                                ))}
                              
                              {/* Recent Insurance Verifications */}
                              {selectedPatient.insurance_eligibility
                                .sort((a, b) => new Date(b.verification_date).getTime() - new Date(a.verification_date).getTime())
                                .slice(0, 2)
                                .map(eligibility => (
                                  <div key={eligibility.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <Shield className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{eligibility.payer_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Verified on {format(parseISO(eligibility.verification_date), "MMM d, yyyy")}
                                      </p>
                                    </div>
                                    <Badge className="text-xs bg-green-100 text-green-800">
                                      {eligibility.status}
                                    </Badge>
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center h-20 text-xs"
                            onClick={() => navigate("/schedule")}
                          >
                            <Calendar className="h-6 w-6 mb-1" />
                            Schedule Appointment
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center h-20 text-xs"
                            onClick={() => navigate("/insurance-eligibility")}
                          >
                            <Shield className="h-6 w-6 mb-1" />
                            Verify Insurance
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center h-20 text-xs"
                            onClick={() => navigate("/intake")}
                          >
                            <ClipboardList className="h-6 w-6 mb-1" />
                            Create Intake Task
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center h-20 text-xs"
                            onClick={() => navigate("/preauth")}
                          >
                            <FileText className="h-6 w-6 mb-1" />
                            Prior Authorization
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Appointments Tab */}
                <TabsContent value="appointments" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Appointment History</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/schedule")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Appointment
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.appointments.length === 0 ? (
                        <div className="text-center py-6">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">No appointments found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Schedule the first appointment for this patient.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPatient.appointments
                            .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
                            .map(appointment => (
                              <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {format(parseISO(appointment.appointment_time), "EEEE, MMMM d, yyyy")}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{format(parseISO(appointment.appointment_time), "h:mm a")}</span>
                                      <span>•</span>
                                      <span className="capitalize">{appointment.appointment_type}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${getStatusColor(appointment.status as any)}`}>
                                    {appointment.status}
                                  </Badge>
                                  {(appointment.no_show_risk || 0) > 0.6 && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">
                                      High Risk
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Appointment Analytics */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Appointment Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <p className="text-3xl font-bold">{selectedPatient.appointments.length}</p>
                          <p className="text-sm text-muted-foreground">Total Appointments</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-green-600">
                            {selectedPatient.appointments.filter(apt => apt.status === "Completed").length}
                          </p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg text-center">
                          <p className="text-3xl font-bold text-red-600">
                            {selectedPatient.appointments.filter(apt => apt.status === "No-Show").length}
                          </p>
                          <p className="text-sm text-muted-foreground">No-Shows</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Insurance Information</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/insurance-eligibility")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Insurance
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.patient_insurance.length === 0 ? (
                        <div className="text-center py-6">
                          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">No insurance information</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add insurance details for this patient.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPatient.patient_insurance.map(insurance => (
                            <div key={insurance.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-blue-600" />
                                  <p className="font-medium">{insurance.insurance_company}</p>
                                </div>
                                {insurance.is_primary && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">Primary</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Policy Number</p>
                                  <p>{insurance.policy_number}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Group Number</p>
                                  <p>{insurance.group_number || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Subscriber</p>
                                  <p>{insurance.subscriber_name || selectedPatient.full_name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Relationship</p>
                                  <p>{insurance.relationship_to_subscriber || "Self"}</p>
                                </div>
                                {insurance.effective_date && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Effective Date</p>
                                    <p>{format(new Date(insurance.effective_date), "MMM d, yyyy")}</p>
                                  </div>
                                )}
                                {insurance.expiration_date && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Expiration Date</p>
                                    <p>{format(new Date(insurance.expiration_date), "MMM d, yyyy")}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Eligibility Verifications */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Eligibility Verifications</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/insurance-eligibility")}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Verify Eligibility
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.insurance_eligibility.length === 0 ? (
                        <div className="text-center py-6">
                          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">No eligibility verifications</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Verify insurance eligibility for this patient.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPatient.insurance_eligibility
                            .sort((a, b) => new Date(b.verification_date).getTime() - new Date(a.verification_date).getTime())
                            .map(eligibility => (
                              <div key={eligibility.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{eligibility.payer_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Verified on {format(parseISO(eligibility.verification_date), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={`text-xs ${
                                  eligibility.status === "Eligible" 
                                    ? "bg-green-100 text-green-800" 
                                    : eligibility.status === "Ineligible"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {eligibility.status}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Intake Documents</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/intake")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Document
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.intake_tasks.length === 0 ? (
                        <div className="text-center py-6">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">No documents found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add intake documents for this patient.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPatient.intake_tasks
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{task.task_description}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Created on {format(parseISO(task.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${
                                    task.status === "Complete" 
                                      ? "bg-green-100 text-green-800" 
                                      : task.status === "Pending OCR"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-orange-100 text-orange-800"
                                  }`}>
                                    {task.status}
                                  </Badge>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Authorizations Tab */}
                <TabsContent value="authorizations" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Prior Authorizations</CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/preauth")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Authorization
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient.pre_authorizations.length === 0 ? (
                        <div className="text-center py-6">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">No authorizations found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Create prior authorizations for this patient.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPatient.pre_authorizations
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map(auth => (
                              <div key={auth.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{auth.service}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Created on {format(parseISO(auth.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={`text-xs ${
                                  auth.status === "Approved" 
                                    ? "bg-green-100 text-green-800" 
                                    : auth.status === "Denied"
                                    ? "bg-red-100 text-red-800"
                                    : auth.status === "Submitted"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {auth.status}
                                </Badge>
                              </div>
                            ))}
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

      {/* Edit Patient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Patient</DialogTitle>
            <DialogDescription className="text-sm">
              Update patient information.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} className="text-sm" />
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
                          <Input placeholder="(123) 456-7890" {...field} className="text-sm" />
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
                          placeholder="Enter full address" 
                          {...field} 
                          className="text-sm resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Emergency Contact</h3>
                
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Emergency contact name" {...field} className="text-sm" />
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
                        <Input placeholder="(123) 456-7890" {...field} className="text-sm" />
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