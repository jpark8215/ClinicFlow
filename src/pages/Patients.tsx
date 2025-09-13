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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Phone,
  Mail,
  Calendar,
  User,
  Shield,
  UserPlus,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";

type PatientWithCounts = Tables<"patients"> & {
  appointment_count: number;
  insurance_count: number;
  document_count: number;
};

const patientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const PatientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithCounts | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      phone: "",
      email: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  const editForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      phone: "",
      email: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  // Fetch patients with counts
  const {
    data: patients,
    isLoading,
    error,
    refetch,
  } = useQuery<PatientWithCounts[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      // First get all patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .order("full_name");
      
      if (patientsError) throw patientsError;
      
      // For each patient, get counts
      const patientsWithCounts = await Promise.all(
        patientsData.map(async (patient) => {
          // Get appointment count
          const { count: appointmentCount, error: appointmentError } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          if (appointmentError) throw appointmentError;
          
          // Get insurance count
          const { count: insuranceCount, error: insuranceError } = await supabase
            .from("patient_insurance")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          if (insuranceError) throw insuranceError;
          
          // Get document count
          const { count: documentCount, error: documentError } = await supabase
            .from("patient_documents")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);
          
          if (documentError) throw documentError;
          
          return {
            ...patient,
            appointment_count: appointmentCount || 0,
            insurance_count: insuranceCount || 0,
            document_count: documentCount || 0,
          };
        })
      );
      
      return patientsWithCounts;
    },
  });

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    return patients.filter((patient) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        patient.full_name.toLowerCase().includes(searchLower) ||
        (patient.phone && patient.phone.toLowerCase().includes(searchLower)) ||
        (patient.email && patient.email.toLowerCase().includes(searchLower)) ||
        (patient.address && patient.address.toLowerCase().includes(searchLower))
      );
    });
  }, [patients, searchTerm]);

  const onSubmit = async (data: PatientFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .insert({
          full_name: data.full_name,
          date_of_birth: data.date_of_birth || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
        });

      if (error) throw error;

      toast({
        title: "Patient Created",
        description: "The patient has been successfully added.",
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

  const handleEditPatient = (patient: PatientWithCounts) => {
    setSelectedPatient(patient);
    editForm.reset({
      full_name: patient.full_name,
      date_of_birth: patient.date_of_birth || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = async (data: PatientFormData) => {
    if (!selectedPatient) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: data.full_name,
          date_of_birth: data.date_of_birth || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
        })
        .eq("id", selectedPatient.id);

      if (error) throw error;

      toast({
        title: "Patient Updated",
        description: "The patient information has been successfully updated.",
      });

      editForm.reset();
      setIsEditOpen(false);
      setIsDetailsOpen(false);
      refetch();
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

  const handleScheduleAppointment = (patient: PatientWithCounts) => {
    // Navigate to schedule page with patient data
    navigate("/schedule", { state: { patient } });
  };

  const handleDeletePatient = async (patient: PatientWithCounts) => {
    if (!confirm(`Are you sure you want to delete ${patient.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patient.id);

      if (error) throw error;

      toast({
        title: "Patient Deleted",
        description: "The patient has been successfully deleted.",
      });

      setIsDetailsOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error Deleting Patient",
        description: error.message || "An unexpected error occurred.",
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
            <h1 className="text-2xl sm:text-3xl font-bold">Patient List</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage patient records and information
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Patient</span>
              <span className="sm:hidden">Add Patient</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Patient</DialogTitle>
              <DialogDescription className="text-sm">
                Enter patient information to create a new patient record.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Basic Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="full_name"
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
                      name="date_of_birth"
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
                          <Input placeholder="123 Main St, City, State, Zip" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Emergency Contact */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Emergency Contact</h3>
                  
                  <FormField
                    control={form.control}
                    name="emergency_contact_name"
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
                    name="emergency_contact_phone"
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
                    {loading ? "Creating..." : "Create Patient"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, phone, email, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Patients ({filteredPatients.length})</CardTitle>
          <CardDescription className="text-sm">
            {filteredPatients.length === 0 && !isLoading
              ? "No patients found."
              : "Manage your patient records and view detailed information."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No patients found</h3>
              <p className="text-muted-foreground text-sm mt-2">
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "Add your first patient to get started."}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-4"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Contact Information</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead className="text-center">Records</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow 
                      key={patient.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{patient.phone}</span>
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{patient.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.date_of_birth ? format(parseISO(patient.date_of_birth), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-3">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{patient.appointment_count}</span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>{patient.insurance_count}</span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{patient.document_count}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
                              setSelectedPatient(patient);
                              setIsDetailsOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEditPatient(patient);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Patient
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleAppointment(patient);
                            }}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Appointment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePatient(patient);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Patient Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this patient
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPatient.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Patient since {format(parseISO(selectedPatient.created_at), "MMMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-sm">
                      {selectedPatient.date_of_birth 
                        ? format(parseISO(selectedPatient.date_of_birth), "MMMM d, yyyy")
                        : "Not provided"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm">{selectedPatient.phone || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedPatient.email || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-sm">{selectedPatient.address || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold">Emergency Contact</h3>
                
                {selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone ? (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-sm">{selectedPatient.emergency_contact_name || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="text-sm">{selectedPatient.emergency_contact_phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No emergency contact information provided.</p>
                )}
              </div>

              {/* Records Summary */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold">Records Summary</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedPatient.appointment_count}</p>
                        <p className="text-sm text-muted-foreground">Appointments</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedPatient.insurance_count}</p>
                        <p className="text-sm text-muted-foreground">Insurance Policies</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedPatient.document_count}</p>
                        <p className="text-sm text-muted-foreground">Documents</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => handleScheduleAppointment(selectedPatient!)}
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Appointment
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => navigate("/insurance-eligibility")}
                >
                  <Shield className="h-4 w-4" />
                  Verify Insurance
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => navigate("/intake")}
                >
                  <UserPlus className="h-4 w-4" />
                  Add to Intake
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => handleEditPatient(selectedPatient!)}
                >
                  <Edit className="h-4 w-4" />
                  Edit Details
                </Button>
              </div>
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
              Update patient information below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Basic Information</h3>
                
                <FormField
                  control={editForm.control}
                  name="full_name"
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
                    control={editForm.control}
                    name="date_of_birth"
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
                    control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, City, State, Zip" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Emergency Contact */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium">Emergency Contact</h3>
                
                <FormField
                  control={editForm.control}
                  name="emergency_contact_name"
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
                  control={editForm.control}
                  name="emergency_contact_phone"
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
                  {loading ? "Updating..." : "Update Patient"}
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