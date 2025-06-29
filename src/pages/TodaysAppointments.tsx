import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Bell,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";

type AppointmentWithDetails = Tables<"appointments"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email" | "address"> | null;
  appointments_providers: Array<{
    providers: Pick<Tables<"providers">, "full_name" | "specialty"> | null;
    role: string | null;
  }>;
};

const TodaysAppointmentsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch today's appointments
  const {
    data: appointments,
    isLoading,
    error,
    refetch,
  } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["todaysAppointments"],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (full_name, phone, email, address),
          appointments_providers (
            role,
            providers (full_name, specialty)
          )
        `)
        .gte("appointment_time", startOfDay)
        .lte("appointment_time", endOfDay)
        .order("appointment_time", { ascending: true });

      if (error) throw new Error(error.message);
      return data as AppointmentWithDetails[];
    },
  });

  // Filter and search appointments
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    return appointments.filter((appointment) => {
      const matchesSearch = 
        appointment.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.appointment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!appointments) return { total: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0, noShow: 0 };

    return appointments.reduce(
      (acc, appointment) => {
        acc.total++;
        switch (appointment.status) {
          case "Confirmed":
            acc.confirmed++;
            break;
          case "Pending":
            acc.pending++;
            break;
          case "Completed":
            acc.completed++;
            break;
          case "Cancelled":
            acc.cancelled++;
            break;
          case "No-Show":
            acc.noShow++;
            break;
        }
        return acc;
      },
      { total: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0, noShow: 0 }
    );
  }, [appointments]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (status: Enums<"appointment_status">) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "Completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "No-Show":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: Enums<"appointment_status">) => {
    switch (status) {
      case "Confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "No-Show":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getRiskLevel = (risk: number | null) => {
    if (!risk) return { level: "Low", color: "text-green-600", bgColor: "bg-green-50" };
    if (risk < 0.3) return { level: "Low", color: "text-green-600", bgColor: "bg-green-50" };
    if (risk < 0.6) return { level: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { level: "High", color: "text-red-600", bgColor: "bg-red-50" };
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: Enums<"appointment_status">) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Appointment status changed to ${newStatus}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  const sendReminder = async (appointment: AppointmentWithDetails) => {
    // In a real app, this would trigger an email/SMS reminder
    toast({
      title: "Reminder Sent",
      description: `Reminder sent to ${appointment.patients?.full_name}`,
    });
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Appointments</h1>
          <p className="text-muted-foreground mt-2">Please try refreshing the page.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Today's Appointments</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{stats.noShow}</p>
                <p className="text-xs text-muted-foreground">No-Show</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, type, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="No-Show">No-Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments ({filteredAppointments.length})</CardTitle>
          <CardDescription>
            {filteredAppointments.length === 0 && !isLoading
              ? "No appointments found for today."
              : "Click on an appointment to view details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No appointments found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "No appointments scheduled for today."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const riskLevel = getRiskLevel(appointment.no_show_risk);
                const provider = appointment.appointments_providers?.[0]?.providers;

                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setIsDetailsOpen(true);
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {appointment.patients ? getInitials(appointment.patients.full_name) : "??"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {appointment.patients?.full_name || "Unknown Patient"}
                          </h3>
                          <Badge className={`${riskLevel.bgColor} ${riskLevel.color} text-xs`}>
                            {riskLevel.level} Risk
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(appointment.appointment_time), "h:mm a")}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {provider?.full_name || "No provider assigned"}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {appointment.appointment_type || "consultation"}
                          </div>
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1">{appointment.status}</span>
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
                            updateAppointmentStatus(appointment.id, "Confirmed");
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateAppointmentStatus(appointment.id, "Completed");
                          }}>
                            <Activity className="h-4 w-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            sendReminder(appointment);
                          }}>
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Appointment
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

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete information for this appointment
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {selectedAppointment.patients ? getInitials(selectedAppointment.patients.full_name) : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedAppointment.patients?.full_name}</p>
                      <p className="text-sm text-muted-foreground">Patient</p>
                    </div>
                  </div>
                  
                  {selectedAppointment.patients?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.patients.phone}</span>
                    </div>
                  )}
                  
                  {selectedAppointment.patients?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.patients.email}</span>
                    </div>
                  )}
                  
                  {selectedAppointment.patients?.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedAppointment.patients.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Appointment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                    <p className="text-sm">
                      {format(parseISO(selectedAppointment.appointment_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-sm">{selectedAppointment.duration_minutes || 30} minutes</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-sm capitalize">{selectedAppointment.appointment_type || "consultation"}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={getStatusColor(selectedAppointment.status)}>
                      {getStatusIcon(selectedAppointment.status)}
                      <span className="ml-1">{selectedAppointment.status}</span>
                    </Badge>
                  </div>
                  
                  {selectedAppointment.no_show_risk && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">No-Show Risk</label>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs ${getRiskLevel(selectedAppointment.no_show_risk).bgColor} ${getRiskLevel(selectedAppointment.no_show_risk).color}`}>
                          {getRiskLevel(selectedAppointment.no_show_risk).level}
                        </div>
                        <span className="text-sm">({Math.round((selectedAppointment.no_show_risk || 0) * 100)}%)</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reminder Sent</label>
                    <p className="text-sm">{selectedAppointment.reminder_sent ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>

              {/* Provider Information */}
              {selectedAppointment.appointments_providers?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Provider Information</h3>
                  <div className="space-y-2">
                    {selectedAppointment.appointments_providers.map((ap, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{ap.providers?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{ap.providers?.specialty}</p>
                        </div>
                        <Badge variant="outline">{ap.role || "Primary"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button 
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Confirmed")}
                  disabled={selectedAppointment.status === "Confirmed"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Confirmed
                </Button>
                <Button 
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Completed")}
                  disabled={selectedAppointment.status === "Completed"}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Mark Completed
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => sendReminder(selectedAppointment)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodaysAppointmentsPage;