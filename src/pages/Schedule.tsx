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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Users,
  Timer,
  FileText,
  Bell,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Brain,
  UserPlus,
  RefreshCw,
  Download,
  Settings,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  parseISO, 
  addMinutes, 
  isSameDay,
  startOfDay,
  endOfDay,
  isToday,
  isTomorrow,
  isYesterday,
  getDay,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
} from "date-fns";
import AddAppointmentDialog from "@/components/appointments/AddAppointmentDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AppointmentWithDetails = Tables<"appointments"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email" | "address"> | null;
  appointments_providers: Array<{
    providers: Pick<Tables<"providers">, "full_name" | "specialty"> | null;
    role: string | null;
  }>;
};

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentWithDetails[];
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  overbookAppointments: number;
  availableSlots: number;
  utilizationRate: number;
}

interface TimeSlot {
  time: string;
  displayTime: string;
  appointments: AppointmentWithDetails[];
  isAvailable: boolean;
  overbookCount: number;
}

const SmartSchedulePage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "timeline" | "analytics">("calendar");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments for the current view period
  const { data: appointments, isLoading, error, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["scheduleAppointments", currentWeekStart, currentMonth, calendarView],
    queryFn: async () => {
      const startDate = calendarView === "week" 
        ? startOfWeek(currentWeekStart)
        : startOfMonth(currentMonth);
      const endDate = calendarView === "week" 
        ? endOfWeek(currentWeekStart)
        : endOfMonth(currentMonth);

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
        .gte("appointment_time", startDate.toISOString())
        .lte("appointment_time", endDate.toISOString())
        .order("appointment_time", { ascending: true });

      if (error) throw new Error(error.message);
      return data as AppointmentWithDetails[];
    },
  });

  // Fetch providers for filtering
  const { data: providers } = useQuery<Tables<"providers">[]>({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Generate calendar days for the current view
  const calendarDays = useMemo((): CalendarDay[] => {
    if (!appointments) return [];

    const days = calendarView === "week"
      ? eachDayOfInterval({ start: startOfWeek(currentWeekStart), end: endOfWeek(currentWeekStart) })
      : eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

    return days.map(date => {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(parseISO(apt.appointment_time), date)
      );

      const filteredAppointments = dayAppointments.filter(appointment => {
        const matchesSearch = !searchTerm || (
          appointment.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointments_providers?.some(ap => 
            ap.providers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ap.providers?.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );

        const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
        const matchesProvider = providerFilter === "all" || 
          appointment.appointments_providers?.some(ap => 
            ap.providers?.full_name === providerFilter
          );

        return matchesSearch && matchesStatus && matchesProvider;
      });

      const confirmedCount = filteredAppointments.filter(apt => apt.status === "Confirmed").length;
      const pendingCount = filteredAppointments.filter(apt => apt.status === "Pending").length;
      const overbookCount = filteredAppointments.filter(apt => apt.notes?.includes("OVERBOOK")).length;
      
      // Calculate utilization (assuming 8-hour workday with 30-min slots = 16 slots)
      const totalSlots = 16;
      const bookedSlots = filteredAppointments.length;
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      return {
        date,
        isCurrentMonth: calendarView === "week" || date.getMonth() === currentMonth.getMonth(),
        isToday: isToday(date),
        appointments: filteredAppointments,
        totalAppointments: filteredAppointments.length,
        confirmedAppointments: confirmedCount,
        pendingAppointments: pendingCount,
        overbookAppointments: overbookCount,
        availableSlots: Math.max(0, totalSlots - bookedSlots),
        utilizationRate,
      };
    });
  }, [appointments, currentWeekStart, currentMonth, calendarView, searchTerm, statusFilter, providerFilter]);

  // Generate time slots for timeline view
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots = [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
      "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
      "17:00", "17:30", "18:00"
    ];

    return slots.map(time => {
      const slotAppointments = appointments?.filter(apt => {
        if (!isSameDay(parseISO(apt.appointment_time), selectedDate)) return false;
        
        const aptTime = format(parseISO(apt.appointment_time), "HH:mm");
        return aptTime === time;
      }) || [];

      const overbookCount = slotAppointments.filter(apt => apt.notes?.includes("OVERBOOK")).length;
      const regularAppointments = slotAppointments.filter(apt => !apt.notes?.includes("OVERBOOK"));

      return {
        time,
        displayTime: format(new Date(`2000-01-01T${time}:00`), "h:mm a"),
        appointments: slotAppointments,
        isAvailable: regularAppointments.length === 0,
        overbookCount,
      };
    });
  }, [appointments, selectedDate]);

  // Analytics data
  const analyticsData = useMemo(() => {
    if (!appointments) return null;

    const totalAppointments = appointments.length;
    const confirmedAppointments = appointments.filter(apt => apt.status === "Confirmed").length;
    const pendingAppointments = appointments.filter(apt => apt.status === "Pending").length;
    const cancelledAppointments = appointments.filter(apt => apt.status === "Cancelled").length;
    const completedAppointments = appointments.filter(apt => apt.status === "Completed").length;
    const noShowAppointments = appointments.filter(apt => apt.status === "No-Show").length;
    const overbookAppointments = appointments.filter(apt => apt.notes?.includes("OVERBOOK")).length;

    const averageUtilization = calendarDays.length > 0 
      ? calendarDays.reduce((sum, day) => sum + day.utilizationRate, 0) / calendarDays.length
      : 0;

    const highRiskAppointments = appointments.filter(apt => (apt.no_show_risk || 0) > 0.6).length;

    return {
      totalAppointments,
      confirmedAppointments,
      pendingAppointments,
      cancelledAppointments,
      completedAppointments,
      noShowAppointments,
      overbookAppointments,
      averageUtilization,
      highRiskAppointments,
      confirmationRate: totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0,
      noShowRate: totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0,
    };
  }, [appointments, calendarDays]);

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

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return "text-red-600 bg-red-50";
    if (rate >= 70) return "text-yellow-600 bg-yellow-50";
    if (rate >= 50) return "text-green-600 bg-green-50";
    return "text-blue-600 bg-blue-50";
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart(prev => 
      direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => 
      direction === "next" ? addDays(prev, 32) : subDays(prev, 32)
    );
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

  if (error) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600">Error Loading Schedule</h1>
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
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Smart Scheduling
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              AI-powered appointment management and optimization
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <AddAppointmentDialog onSuccess={() => refetch()} />
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments, patients, or providers..."
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
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No-Show">No-Show</SelectItem>
                </SelectContent>
              </Select>

              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers?.map((provider) => (
                    <SelectItem key={provider.id} value={provider.full_name}>
                      <div className="flex flex-col">
                        <span className="text-sm">{provider.full_name}</span>
                        {provider.specialty && (
                          <span className="text-xs text-muted-foreground">
                            {provider.specialty}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={calendarView} onValueChange={(value) => setCalendarView(value as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calendarView === "week" ? navigateWeek("prev") : navigateMonth("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center">
                  {calendarView === "week" 
                    ? `${format(startOfWeek(currentWeekStart), "MMM d")} - ${format(endOfWeek(currentWeekStart), "MMM d, yyyy")}`
                    : format(currentMonth, "MMMM yyyy")
                  }
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calendarView === "week" ? navigateWeek("next") : navigateMonth("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setCurrentWeekStart(startOfWeek(today));
                  setCurrentMonth(today);
                }}
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Busy</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-4 ${calendarView === "week" ? "grid-cols-1 sm:grid-cols-7" : "grid-cols-1 sm:grid-cols-7"}`}>
              {calendarDays.map((day, index) => (
                <Card
                  key={day.date.toISOString()}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    day.isToday ? "ring-2 ring-primary shadow-lg" : ""
                  } ${!day.isCurrentMonth ? "opacity-50" : ""}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {format(day.date, calendarView === "week" ? "EEE" : "d")}
                        </h3>
                        {calendarView === "week" && (
                          <p className="text-xs text-muted-foreground">
                            {format(day.date, "MMM d")}
                          </p>
                        )}
                        {calendarView === "month" && (
                          <p className="text-xs text-muted-foreground">
                            {format(day.date, "EEE")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          className={`text-xs ${getUtilizationColor(day.utilizationRate)}`}
                          variant="outline"
                        >
                          {Math.round(day.utilizationRate)}%
                        </Badge>
                        {day.overbookAppointments > 0 && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            +{day.overbookAppointments}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">{day.totalAppointments}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Available:</span>
                          <span className="ml-1 font-medium text-green-600">{day.availableSlots}</span>
                        </div>
                      </div>
                      
                      {day.appointments.slice(0, 3).map((appointment, idx) => (
                        <div key={appointment.id} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="truncate">
                            {format(parseISO(appointment.appointment_time), "HH:mm")} - {appointment.patients?.full_name}
                          </span>
                        </div>
                      ))}
                      
                      {day.appointments.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{day.appointments.length - 3} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {timeSlots.filter(slot => !slot.isAvailable).length} of {timeSlots.length} slots booked
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {timeSlots.map((slot) => (
              <Card
                key={slot.time}
                className={`transition-all duration-200 hover:shadow-md ${
                  slot.isAvailable 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{slot.displayTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.isAvailable ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Booked
                        </Badge>
                      )}
                      {slot.overbookCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          <UserPlus className="h-3 w-3 mr-1" />
                          +{slot.overbookCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {slot.appointments.length > 0 ? (
                    <div className="space-y-3">
                      {slot.appointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center gap-3 p-2 bg-white rounded border cursor-pointer hover:shadow-sm"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {appointment.patients ? getInitials(appointment.patients.full_name) : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {appointment.patients?.full_name || "Unknown Patient"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{appointment.appointment_type}</span>
                              {appointment.appointments_providers?.[0]?.providers?.full_name && (
                                <>
                                  <span>•</span>
                                  <span>{appointment.appointments_providers[0].providers.full_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-green-700 font-medium">Available Slot</p>
                      <p className="text-xs text-green-600 mt-1">Click to book appointment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsData && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{analyticsData.totalAppointments}</p>
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
                        <p className="text-2xl font-bold">{analyticsData.confirmedAppointments}</p>
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
                        <p className="text-2xl font-bold">{analyticsData.pendingAppointments}</p>
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
                        <p className="text-2xl font-bold">{analyticsData.completedAppointments}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{analyticsData.overbookAppointments}</p>
                        <p className="text-xs text-muted-foreground">Overbook</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">{analyticsData.highRiskAppointments}</p>
                        <p className="text-xs text-muted-foreground">High Risk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Utilization Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {Math.round(analyticsData.averageUtilization)}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Average schedule utilization
                      </p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${analyticsData.averageUtilization}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Confirmation Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {Math.round(analyticsData.confirmationRate)}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Appointments confirmed
                      </p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${analyticsData.confirmationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      No-Show Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600 mb-2">
                        {Math.round(analyticsData.noShowRate)}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Missed appointments
                      </p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${analyticsData.noShowRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription>
                    Smart recommendations to optimize your schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.averageUtilization < 60 && (
                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Optimization Opportunity:</strong> Your average utilization is {Math.round(analyticsData.averageUtilization)}%. 
                          Consider consolidating appointments or reducing available time slots to improve efficiency.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {analyticsData.noShowRate > 15 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>High No-Show Rate:</strong> {Math.round(analyticsData.noShowRate)}% of appointments result in no-shows. 
                          Consider implementing reminder systems or overbook strategies.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {analyticsData.overbookAppointments > 0 && (
                      <Alert>
                        <UserPlus className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Overbook Strategy Active:</strong> You have {analyticsData.overbookAppointments} overbook appointments 
                          to compensate for potential no-shows. Monitor actual attendance to optimize this strategy.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {analyticsData.highRiskAppointments > 0 && (
                      <Alert>
                        <Bell className="h-4 w-4" />
                        <AlertDescription>
                          <strong>High-Risk Appointments:</strong> {analyticsData.highRiskAppointments} appointments have high no-show risk. 
                          Consider sending priority reminders or creating backup overbook slots.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Appointment Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information for this appointment
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 sm:space-y-6">
              {/* Patient Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Patient Information</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedAppointment.patients ? getInitials(selectedAppointment.patients.full_name) : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAppointment.patients?.full_name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {selectedAppointment.patients?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedAppointment.patients.phone}
                        </div>
                      )}
                      {selectedAppointment.patients?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedAppointment.patients.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Appointment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Badge className={`${getStatusColor(selectedAppointment.status)} text-xs mt-1`}>
                      {selectedAppointment.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Provider Information */}
              {selectedAppointment.appointments_providers?.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Provider Information</h3>
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
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button 
                  size="sm"
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Confirmed")}
                  disabled={selectedAppointment.status === "Confirmed"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button 
                  size="sm"
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Completed")}
                  disabled={selectedAppointment.status === "Completed"}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartSchedulePage;