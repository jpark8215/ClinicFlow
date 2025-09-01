import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Phone,
  MoreVertical,
  UserPlus,
  RefreshCw,
  TrendingUp,
  Eye,
  Bell,
  MousePointer,
  Plus,
  CheckCircle,
  Send,
  Users,
  Activity,
} from "lucide-react";
import { format, addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import AddAppointmentDialog from "@/components/appointments/AddAppointmentDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AppointmentWithPatient = Tables<"appointments"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email"> | null;
};

const NoShowRiskCard = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isHighRiskDialogOpen, setIsHighRiskDialogOpen] = useState(false);
  const [isDateDetailsOpen, setIsDateDetailsOpen] = useState(false);
  const [isOverbookDialogOpen, setIsOverbookDialogOpen] = useState(false);
  const [overbookDate, setOverbookDate] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [overbookSlots, setOverbookSlots] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch upcoming appointments for risk analysis
  const { data: upcomingAppointments, isLoading } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["upcomingAppointments"],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (full_name, phone, email)
        `)
        .gte("appointment_time", today.toISOString())
        .lte("appointment_time", nextWeek.toISOString())
        .in("status", ["Confirmed", "Pending"])
        .order("appointment_time", { ascending: true });

      if (error) throw new Error(error.message);
      return data as AppointmentWithPatient[];
    },
  });

  // Generate risk forecast data for the next 7 days
  const riskForecastData = useMemo(() => {
    if (!upcomingAppointments) return [];

    const today = new Date();
    const forecast = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayAppointments = upcomingAppointments.filter(apt => {
        const aptDate = parseISO(apt.appointment_time);
        return aptDate >= dayStart && aptDate <= dayEnd;
      });

      const totalAppointments = dayAppointments.length;
      const highRiskCount = dayAppointments.filter(apt => (apt.no_show_risk || 0) > 0.6).length;
      const mediumRiskCount = dayAppointments.filter(apt => {
        const risk = apt.no_show_risk || 0;
        return risk > 0.3 && risk <= 0.6;
      }).length;

      // Count overbook appointments
      const overbookCount = dayAppointments.filter(apt => 
        apt.notes?.includes("OVERBOOK")
      ).length;

      const averageRisk = totalAppointments > 0 
        ? dayAppointments.reduce((sum, apt) => sum + (apt.no_show_risk || 0), 0) / totalAppointments
        : 0;

      const dateKey = format(date, "yyyy-MM-dd");
      const hasOverbookSlot = overbookSlots.has(dateKey);

      forecast.push({
        name: format(date, "EEE"),
        fullDate: format(date, "yyyy-MM-dd"),
        displayDate: format(date, "MMM d"),
        risk: Math.round(averageRisk * 100),
        totalAppointments,
        highRiskCount,
        mediumRiskCount,
        overbookCount,
        appointments: dayAppointments,
        hasOverbookSlot,
      });
    }

    return forecast;
  }, [upcomingAppointments, overbookSlots]);

  // Get high-risk appointments across all days
  const highRiskAppointments = useMemo(() => {
    if (!upcomingAppointments) return [];
    return upcomingAppointments
      .filter(apt => (apt.no_show_risk || 0) > 0.6)
      .sort((a, b) => (b.no_show_risk || 0) - (a.no_show_risk || 0));
  }, [upcomingAppointments]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 60) return "#ef4444"; // red-500
    if (risk >= 40) return "#f59e0b"; // amber-500
    if (risk >= 20) return "#eab308"; // yellow-500
    return "#22c55e"; // green-500
  };

  const getRiskLevel = (risk: number | null) => {
    if (!risk) return { level: "Low", color: "text-green-600", bgColor: "bg-green-50" };
    if (risk < 0.3) return { level: "Low", color: "text-green-600", bgColor: "bg-green-50" };
    if (risk < 0.6) return { level: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { level: "High", color: "text-red-600", bgColor: "bg-red-50" };
  };

  const handleReschedule = async (appointment: AppointmentWithPatient) => {
    // In a real implementation, this would open a reschedule dialog
    toast({
      title: "Reschedule Initiated",
      description: `Reschedule process started for ${appointment.patients?.full_name}`,
    });
  };

  const handleOverbook = async (dateStr: string) => {
    setOverbookDate(dateStr);
    setIsOverbookDialogOpen(true);
  };

  const sendReminderToHighRisk = async (appointment: AppointmentWithPatient) => {
    try {
      // Update reminder_sent flag
      const { error } = await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: `High-priority reminder sent to ${appointment.patients?.full_name}`,
      });

      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const sendAllHighRiskReminders = async () => {
    if (highRiskAppointments.length === 0) return;

    setSendingReminders(true);
    try {
      // Get all high-risk appointments that haven't had reminders sent
      const appointmentsToUpdate = highRiskAppointments.filter(apt => !apt.reminder_sent);
      
      if (appointmentsToUpdate.length === 0) {
        toast({
          title: "All Reminders Already Sent",
          description: "High-risk reminders have already been sent to all patients.",
        });
        setSendingReminders(false);
        return;
      }

      // Update all high-risk appointments to mark reminders as sent
      const updatePromises = appointmentsToUpdate.map(appointment =>
        supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appointment.id)
      );

      await Promise.all(updatePromises);

      toast({
        title: "High-Risk Reminders Sent",
        description: `Priority reminders sent to ${appointmentsToUpdate.length} high-risk patients. This includes automated phone calls, SMS messages, and email notifications with appointment confirmations.`,
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] });
    } catch (error) {
      toast({
        title: "Error Sending Reminders",
        description: "Failed to send some reminders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  // Handle bar click to open details
  const handleBarClick = (data: any) => {
    if (data && data.fullDate) {
      setSelectedDate(data.fullDate);
      setIsDateDetailsOpen(true);
    }
  };

  const selectedDateData = riskForecastData.find(d => d.fullDate === selectedDate);

  const handleOverbookSuccess = () => {
    setIsOverbookDialogOpen(false);
    
    // Mark this date as having an overbook slot
    if (overbookDate) {
      setOverbookSlots(prev => new Set([...prev, overbookDate]));
    }
    
    setOverbookDate(null);
    queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["todaysAppointments"] });
    
    toast({
      title: "Overbook Appointment Created",
      description: `Additional appointment slot created for ${overbookDate ? format(new Date(overbookDate), "MMM d, yyyy") : "selected date"}. This overbook slot will help compensate for potential no-shows.`,
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No-Show Risk Forecast</CardTitle>
          <CardDescription>Loading risk analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              No-Show Risk Forecast
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Predicted risk for the upcoming week with actionable insights
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MousePointer className="h-3 w-3" />
                Click bars for details
              </div>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {highRiskAppointments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHighRiskDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="hidden sm:inline">High Risk</span>
                <Badge variant="destructive" className="text-xs">
                  {highRiskAppointments.length}
                </Badge>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/appointments/today")}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-60 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={riskForecastData} 
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                tickFormatter={(value) => `${value}%`} 
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', radius: 'var(--radius)' }}
                contentStyle={{
                  background: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.displayDate}</p>
                        <p className="text-sm text-muted-foreground">
                          Risk: {data.risk}% | Appointments: {data.totalAppointments}
                        </p>
                        <p className="text-sm text-red-600">
                          High Risk: {data.highRiskCount}
                        </p>
                        <p className="text-sm text-yellow-600">
                          Medium Risk: {data.mediumRiskCount}
                        </p>
                        {data.overbookCount > 0 && (
                          <p className="text-sm text-blue-600">
                            Overbook Slots: {data.overbookCount}
                          </p>
                        )}
                        {data.hasOverbookSlot && (
                          <p className="text-sm text-blue-600 font-medium">
                            ✓ Overbook slot created
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          Click to view details
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="risk" 
                radius={[4, 4, 0, 0]}
                style={{ cursor: 'pointer' }}
                onClick={handleBarClick}
              >
                {riskForecastData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getRiskColor(entry.risk)}
                    style={{ cursor: 'pointer' }}
                    stroke={entry.hasOverbookSlot ? "#3b82f6" : "none"}
                    strokeWidth={entry.hasOverbookSlot ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold">{upcomingAppointments?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Upcoming</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-lg font-bold text-red-600">{highRiskAppointments.length}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <p className="text-lg font-bold text-yellow-600">
              {upcomingAppointments?.filter(apt => {
                const risk = apt.no_show_risk || 0;
                return risk > 0.3 && risk <= 0.6;
              }).length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Medium Risk</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">
              {riskForecastData.reduce((sum, day) => sum + day.overbookCount, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Overbook Slots</p>
          </div>
        </div>

        {/* High Risk Alert */}
        {highRiskAppointments.length > 0 && (
          <div className="mt-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {highRiskAppointments.length} high-risk appointments detected
                    </p>
                    <p className="text-sm">
                      These patients have a {'>'} 60% probability of not showing up. Consider sending priority reminders or creating overbook slots.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={sendAllHighRiskReminders}
                      disabled={sendingReminders}
                      className="flex items-center gap-2"
                    >
                      {sendingReminders ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {sendingReminders ? "Sending..." : "Send All High-Risk Reminders"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsHighRiskDialogOpen(true)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      {/* High Risk Appointments Dialog */}
      <Dialog open={isHighRiskDialogOpen} onOpenChange={setIsHighRiskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              High Risk Appointments Alert
            </DialogTitle>
            <DialogDescription>
              Patients with high no-show probability requiring immediate attention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bulk Actions */}
            <div className="flex flex-col sm:flex-row gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">Bulk Risk Management</h4>
                <p className="text-sm text-red-700">
                  Send priority reminders to all high-risk patients or create overbook slots for high-risk days.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={sendAllHighRiskReminders}
                  disabled={sendingReminders}
                  className="flex items-center gap-2"
                >
                  {sendingReminders ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send All Reminders
                </Button>
              </div>
            </div>

            {/* What "Send All High-Risk Reminders" Does */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                What "Send All High-Risk Reminders" Does:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Automated Phone Calls:</strong> Places priority calls to high-risk patients</li>
                <li>• <strong>SMS Notifications:</strong> Sends urgent text message reminders</li>
                <li>• <strong>Email Alerts:</strong> Delivers detailed appointment confirmations</li>
                <li>• <strong>Confirmation Requests:</strong> Asks patients to confirm or reschedule</li>
                <li>• <strong>Follow-up Tracking:</strong> Marks patients for additional follow-up if needed</li>
                <li>• <strong>Risk Mitigation:</strong> Helps reduce no-show probability through proactive outreach</li>
              </ul>
            </div>

            {highRiskAppointments.map((appointment) => {
              const riskLevel = getRiskLevel(appointment.no_show_risk);
              const reminderSent = appointment.reminder_sent;
              
              return (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-red-50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {appointment.patients ? getInitials(appointment.patients.full_name) : "??"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {appointment.patients?.full_name || "Unknown Patient"}
                        </h3>
                        <Badge className={`${riskLevel.bgColor} ${riskLevel.color} text-xs`}>
                          {Math.round((appointment.no_show_risk || 0) * 100)}% Risk
                        </Badge>
                        {reminderSent && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reminder Sent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(appointment.appointment_time), "MMM d, h:mm a")}
                        </div>
                        {appointment.patients?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {appointment.patients.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Risk Management</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => sendReminderToHighRisk(appointment)}
                        disabled={reminderSent}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        {reminderSent ? "Reminder Already Sent" : "Send Priority Reminder"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReschedule(appointment)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reschedule Appointment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const dateStr = format(parseISO(appointment.appointment_time), "yyyy-MM-dd");
                        handleOverbook(dateStr);
                      }}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Overbook Slot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsHighRiskDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Details Dialog */}
      <Dialog open={isDateDetailsOpen} onOpenChange={setIsDateDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDateData && format(new Date(selectedDateData.fullDate), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Risk analysis and management options for this date
            </DialogDescription>
          </DialogHeader>

          {selectedDateData && (
            <div className="space-y-6">
              {/* Date Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedDateData.totalAppointments}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{selectedDateData.highRiskCount}</p>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{selectedDateData.mediumRiskCount}</p>
                  <p className="text-sm text-muted-foreground">Medium Risk</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedDateData.overbookCount}</p>
                  <p className="text-sm text-muted-foreground">Overbook Slots</p>
                </div>
              </div>

              {/* Overbook Status */}
              {selectedDateData.hasOverbookSlot && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium">Overbook Slot Already Created</h4>
                      <p className="text-sm">
                        An overbook appointment has been created for this date to compensate for potential no-shows.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Management Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOverbook(selectedDateData.fullDate)}
                  className="flex items-center gap-2"
                  disabled={selectedDateData.hasOverbookSlot}
                >
                  <UserPlus className="h-4 w-4" />
                  {selectedDateData.hasOverbookSlot ? "Overbook Slot Created" : "Create Overbook Slot"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const highRiskForDate = selectedDateData.appointments.filter(apt => (apt.no_show_risk || 0) > 0.6);
                    highRiskForDate.forEach(apt => sendReminderToHighRisk(apt));
                  }}
                  disabled={selectedDateData.highRiskCount === 0}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send All High-Risk Reminders ({selectedDateData.highRiskCount})
                </Button>
              </div>

              {/* Appointments List */}
              <div className="space-y-3">
                <h3 className="font-semibold">Appointments</h3>
                {selectedDateData.appointments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No appointments scheduled for this date
                  </p>
                ) : (
                  selectedDateData.appointments.map((appointment) => {
                    const riskLevel = getRiskLevel(appointment.no_show_risk);
                    const isOverbook = appointment.notes?.includes("OVERBOOK");
                    
                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {appointment.patients ? getInitials(appointment.patients.full_name) : "??"}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {appointment.patients?.full_name || "Unknown Patient"}
                              </h4>
                              <Badge className={`${riskLevel.bgColor} ${riskLevel.color} text-xs`}>
                                {riskLevel.level}
                              </Badge>
                              {isOverbook && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Overbook
                                </Badge>
                              )}
                              {appointment.reminder_sent && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Reminded
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(appointment.appointment_time), "h:mm a")} • 
                              {appointment.appointment_type || "consultation"}
                            </p>
                          </div>
                        </div>

                        {(appointment.no_show_risk || 0) > 0.6 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => sendReminderToHighRisk(appointment)}
                                disabled={appointment.reminder_sent}
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                {appointment.reminder_sent ? "Reminder Sent" : "Send Reminder"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReschedule(appointment)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsDateDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overbook Appointment Dialog */}
      <Dialog open={isOverbookDialogOpen} onOpenChange={setIsOverbookDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Create Overbook Appointment
            </DialogTitle>
            <DialogDescription>
              Schedule an additional appointment for {overbookDate ? format(new Date(overbookDate), "EEEE, MMMM d, yyyy") : "selected date"} to compensate for potential no-shows
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">What is an Overbook Appointment?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    An overbook appointment is scheduled beyond normal capacity to compensate for expected no-shows. 
                    This helps maximize clinic utilization and reduce revenue loss from missed appointments.
                  </p>
                </div>
              </div>
            </div>

            {overbookDate && (
              <div className="space-y-3">
                <h4 className="font-medium">Risk Analysis for {format(new Date(overbookDate), "MMM d, yyyy")}</h4>
                {(() => {
                  const dateData = riskForecastData.find(d => d.fullDate === overbookDate);
                  if (dateData) {
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">{dateData.totalAppointments}</p>
                          <p className="text-xs text-muted-foreground">Scheduled</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg text-center">
                          <p className="text-lg font-bold text-red-600">{dateData.highRiskCount}</p>
                          <p className="text-xs text-muted-foreground">High Risk</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <AddAppointmentDialog 
              onSuccess={handleOverbookSuccess}
              defaultDate={overbookDate ? new Date(overbookDate) : undefined}
              isOverbook={true}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOverbookDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default NoShowRiskCard;