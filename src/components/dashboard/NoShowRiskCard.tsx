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
} from "lucide-react";
import { format, addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

type AppointmentWithPatient = Tables<"appointments"> & {
  patients: Pick<Tables<"patients">, "full_name" | "phone" | "email"> | null;
};

const NoShowRiskCard = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isHighRiskDialogOpen, setIsHighRiskDialogOpen] = useState(false);
  const [isDateDetailsOpen, setIsDateDetailsOpen] = useState(false);
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

      const averageRisk = totalAppointments > 0 
        ? dayAppointments.reduce((sum, apt) => sum + (apt.no_show_risk || 0), 0) / totalAppointments
        : 0;

      forecast.push({
        name: format(date, "EEE"),
        fullDate: format(date, "yyyy-MM-dd"),
        displayDate: format(date, "MMM d"),
        risk: Math.round(averageRisk * 100),
        totalAppointments,
        highRiskCount,
        mediumRiskCount,
        appointments: dayAppointments,
      });
    }

    return forecast;
  }, [upcomingAppointments]);

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
    // In a real implementation, this would create an overbook slot
    toast({
      title: "Overbook Slot Created",
      description: `Additional appointment slot created for ${format(new Date(dateStr), "MMM d, yyyy")}`,
    });
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

  // Handle bar click to open details
  const handleBarClick = (data: any) => {
    if (data && data.fullDate) {
      setSelectedDate(data.fullDate);
      setIsDateDetailsOpen(true);
    }
  };

  const selectedDateData = riskForecastData.find(d => d.fullDate === selectedDate);

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
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">
              {upcomingAppointments?.filter(apt => (apt.no_show_risk || 0) <= 0.3).length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Low Risk</p>
          </div>
        </div>
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
            {highRiskAppointments.map((appointment) => {
              const riskLevel = getRiskLevel(appointment.no_show_risk);
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
                      <DropdownMenuItem onClick={() => sendReminderToHighRisk(appointment)}>
                        <Bell className="h-4 w-4 mr-2" />
                        Send Priority Reminder
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
                  <p className="text-2xl font-bold text-blue-600">{selectedDateData.risk}%</p>
                  <p className="text-sm text-muted-foreground">Avg Risk</p>
                </div>
              </div>

              {/* Risk Management Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOverbook(selectedDateData.fullDate)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Overbook Slot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedDateData.appointments
                      .filter(apt => (apt.no_show_risk || 0) > 0.6)
                      .forEach(apt => sendReminderToHighRisk(apt));
                  }}
                  disabled={selectedDateData.highRiskCount === 0}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send All High-Risk Reminders
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
                              <DropdownMenuItem onClick={() => sendReminderToHighRisk(appointment)}>
                                <Bell className="h-4 w-4 mr-2" />
                                Send Reminder
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
    </Card>
  );
};

export default NoShowRiskCard;