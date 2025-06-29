import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/integrations/supabase/types";
import { CalendarIcon, Plus, UserPlus, AlertTriangle, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { format, addMinutes, parseISO, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  appointmentDate: z.date({
    required_error: "Please select an appointment date",
  }),
  appointmentTime: z.string().min(1, "Please select an appointment time"),
  duration: z.string().min(1, "Please select duration"),
  appointmentType: z.string().min(1, "Please select appointment type"),
  providerId: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AddAppointmentDialogProps {
  onSuccess?: () => void;
  defaultDate?: Date;
  isOverbook?: boolean;
}

interface TimeConflict {
  id: string;
  patient_name: string;
  start_time: Date;
  end_time: Date;
  appointment_type: string;
  provider_name?: string;
  status: string;
}

interface TimeSlotData {
  time: string;
  available: boolean;
  appointments: Array<{
    id: string;
    patient_name: string;
    appointment_type: string;
    provider_name?: string;
    status: string;
    duration: number;
  }>;
  overbookCount: number;
}

const AddAppointmentDialog = ({ onSuccess, defaultDate, isOverbook = false }: AddAppointmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeConflicts, setTimeConflicts] = useState<TimeConflict[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      appointmentTime: "",
      duration: "30",
      appointmentType: "consultation",
      providerId: "",
      notes: isOverbook ? "OVERBOOK: Scheduled to compensate for potential no-shows" : "",
      appointmentDate: defaultDate || undefined,
    },
  });

  // Watch form values for conflict detection
  const watchedValues = form.watch();

  // Fetch patients
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

  // Fetch providers
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

  // Fetch existing appointments for conflict detection
  const { data: existingAppointments } = useQuery({
    queryKey: ["appointmentsForConflictCheck", watchedValues.appointmentDate],
    queryFn: async () => {
      if (!watchedValues.appointmentDate) return [];

      const startOfDay = new Date(watchedValues.appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(watchedValues.appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_time,
          duration_minutes,
          appointment_type,
          status,
          notes,
          patients (full_name),
          appointments_providers (
            providers (full_name)
          )
        `)
        .gte("appointment_time", startOfDay.toISOString())
        .lte("appointment_time", endOfDay.toISOString())
        .in("status", ["Confirmed", "Pending"])
        .order("appointment_time");

      if (error) throw error;
      return data;
    },
    enabled: !!watchedValues.appointmentDate,
  });

  // Check for time conflicts whenever relevant form values change
  useEffect(() => {
    if (!watchedValues.appointmentDate || !watchedValues.appointmentTime || !watchedValues.duration || !existingAppointments) {
      setTimeConflicts([]);
      setShowConflictWarning(false);
      return;
    }

    const checkTimeConflicts = () => {
      const newAppointmentStart = new Date(watchedValues.appointmentDate);
      const [hours, minutes] = watchedValues.appointmentTime.split(':');
      newAppointmentStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const newAppointmentEnd = addMinutes(newAppointmentStart, parseInt(watchedValues.duration));

      const conflicts: TimeConflict[] = [];

      existingAppointments.forEach((appointment: any) => {
        const existingStart = parseISO(appointment.appointment_time);
        const existingEnd = addMinutes(existingStart, appointment.duration_minutes || 30);

        // Check if appointments overlap
        const hasOverlap = (
          (isBefore(newAppointmentStart, existingEnd) && isAfter(newAppointmentEnd, existingStart)) ||
          (isBefore(existingStart, newAppointmentEnd) && isAfter(existingEnd, newAppointmentStart))
        );

        if (hasOverlap) {
          const isOverbookAppointment = appointment.notes?.includes("OVERBOOK");
          conflicts.push({
            id: appointment.id,
            patient_name: appointment.patients?.full_name || "Unknown Patient",
            start_time: existingStart,
            end_time: existingEnd,
            appointment_type: appointment.appointment_type || "consultation",
            provider_name: appointment.appointments_providers?.[0]?.providers?.full_name,
            status: isOverbookAppointment ? "overbook" : appointment.status,
          });
        }
      });

      setTimeConflicts(conflicts);
      // Only show warning for regular appointments, not overbook
      setShowConflictWarning(conflicts.length > 0 && !isOverbook);
    };

    checkTimeConflicts();
  }, [watchedValues.appointmentDate, watchedValues.appointmentTime, watchedValues.duration, existingAppointments, isOverbook]);

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00"
  ];

  const appointmentTypes = [
    { value: "consultation", label: "Consultation" },
    { value: "follow-up", label: "Follow-up" },
    { value: "procedure", label: "Procedure" },
    { value: "screening", label: "Screening" },
    { value: "emergency", label: "Emergency" },
    { value: "physical", label: "Physical Exam" },
  ];

  const durations = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" },
  ];

  // Generate time slot data for visual chart
  const getTimeSlotData = (): TimeSlotData[] => {
    if (!watchedValues.appointmentDate || !existingAppointments) {
      return timeSlots.map(time => ({
        time,
        available: true,
        appointments: [],
        overbookCount: 0,
      }));
    }

    return timeSlots.map(timeSlot => {
      const slotStart = new Date(watchedValues.appointmentDate);
      const [hours, minutes] = timeSlot.split(':');
      slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const slotEnd = addMinutes(slotStart, 30); // Standard 30-minute slots

      const slotAppointments: any[] = [];
      let overbookCount = 0;

      existingAppointments.forEach((appointment: any) => {
        const appointmentStart = parseISO(appointment.appointment_time);
        const appointmentEnd = addMinutes(appointmentStart, appointment.duration_minutes || 30);

        // Check if appointment overlaps with this time slot
        const hasOverlap = (
          (isBefore(appointmentStart, slotEnd) && isAfter(appointmentEnd, slotStart))
        );

        if (hasOverlap) {
          const isOverbookAppointment = appointment.notes?.includes("OVERBOOK");
          
          if (isOverbookAppointment) {
            overbookCount++;
          } else {
            slotAppointments.push({
              id: appointment.id,
              patient_name: appointment.patients?.full_name || "Unknown Patient",
              appointment_type: appointment.appointment_type || "consultation",
              provider_name: appointment.appointments_providers?.[0]?.providers?.full_name,
              status: appointment.status,
              duration: appointment.duration_minutes || 30,
            });
          }
        }
      });

      return {
        time: timeSlot,
        available: slotAppointments.length === 0,
        appointments: slotAppointments,
        overbookCount,
      };
    });
  };

  const timeSlotData = getTimeSlotData();

  // Get available time slots (excluding conflicted ones for regular appointments)
  const getAvailableTimeSlots = () => {
    if (isOverbook) {
      // Overbook appointments can be scheduled at any time
      return timeSlots;
    }

    return timeSlotData.filter(slot => slot.available).map(slot => slot.time);
  };

  const availableTimeSlots = getAvailableTimeSlots();

  const onSubmit = async (data: AppointmentFormData) => {
    // Show warning if there are conflicts and it's not an overbook
    if (timeConflicts.length > 0 && !isOverbook) {
      toast({
        title: "Time Conflict Detected",
        description: `This time slot conflicts with ${timeConflicts.length} existing appointment(s). Please choose a different time or create an overbook appointment.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const appointmentDateTime = new Date(data.appointmentDate);
      const [hours, minutes] = data.appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Calculate no-show risk for overbook appointments (typically lower since they're backup)
      const noShowRisk = isOverbook ? Math.random() * 0.3 : Math.random() * 0.8; // Overbook slots have lower risk

      // Insert appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: data.patientId,
          appointment_time: appointmentDateTime.toISOString(),
          duration_minutes: parseInt(data.duration),
          appointment_type: data.appointmentType,
          notes: data.notes || null,
          status: "Pending",
          no_show_risk: noShowRisk,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Link provider if selected
      if (data.providerId && appointment) {
        const { error: providerError } = await supabase
          .from("appointments_providers")
          .insert({
            appointment_id: appointment.id,
            provider_id: data.providerId,
            role: "Primary",
          });

        if (providerError) throw providerError;
      }

      const successMessage = isOverbook 
        ? "Overbook appointment created successfully"
        : "Appointment created successfully";

      toast({
        title: successMessage,
        description: isOverbook 
          ? "Additional appointment slot created to compensate for potential no-shows."
          : "The appointment has been successfully scheduled.",
      });

      // Reset form and close dialog
      form.reset();
      setOpen(false);
      setTimeConflicts([]);
      setShowConflictWarning(false);
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["todaysAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointmentsForConflictCheck"] });
      
      // Call success callback
      onSuccess?.();

    } catch (error: any) {
      toast({
        title: "Error Creating Appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    form.setValue("appointmentTime", timeSlot);
    setActiveTab("form");
  };

  const dialogTitle = isOverbook ? "Create Overbook Appointment" : "Schedule New Appointment";
  const dialogDescription = isOverbook 
    ? "Create an additional appointment slot to compensate for potential no-shows."
    : "Create a new appointment for a patient with a healthcare provider.";

  const triggerButton = isOverbook ? (
    <Button className="flex items-center gap-2 w-full">
      <UserPlus className="h-4 w-4" />
      Create Overbook Appointment
    </Button>
  ) : (
    <Button className="flex items-center gap-2 w-full sm:w-auto">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">New Appointment</span>
      <span className="sm:hidden">New</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            {isOverbook ? <UserPlus className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5" />}
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {dialogDescription}
          </DialogDescription>
          {isOverbook && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-blue-700">
                <strong>Overbook Strategy:</strong> This appointment can be scheduled at any time, even when slots are already booked, to compensate for expected no-shows.
              </div>
            </div>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Appointment Form</TabsTrigger>
            <TabsTrigger value="schedule">Visual Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4 sm:space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Patient Selection */}
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

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm">Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal text-sm",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm flex items-center gap-2">
                          Time *
                          {!isOverbook && availableTimeSlots.length < timeSlots.length && (
                            <Badge variant="outline" className="text-xs">
                              {availableTimeSlots.length} available
                            </Badge>
                          )}
                          {isOverbook && (
                            <Badge variant="secondary" className="text-xs">
                              All times available
                            </Badge>
                          )}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeSlots.map((time) => {
                              const slotData = timeSlotData.find(slot => slot.time === time);
                              const isAvailable = slotData?.available || false;
                              const hasOverbooks = (slotData?.overbookCount || 0) > 0;
                              
                              return (
                                <SelectItem 
                                  key={time} 
                                  value={time}
                                  disabled={!isAvailable && !isOverbook}
                                  className={!isAvailable && !isOverbook ? "opacity-50" : ""}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>{time}</span>
                                    <div className="flex items-center gap-1 ml-2">
                                      {!isAvailable && (
                                        <Badge variant="secondary" className="text-xs">
                                          Booked
                                        </Badge>
                                      )}
                                      {hasOverbooks && (
                                        <Badge variant="outline" className="text-xs text-blue-600">
                                          +{slotData?.overbookCount} overbook
                                        </Badge>
                                      )}
                                      {isAvailable && (
                                        <Badge variant="outline" className="text-xs text-green-600">
                                          Available
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Time Conflict Warning */}
                {showConflictWarning && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <div className="space-y-2">
                        <p className="font-medium">
                          Time Conflict Detected ({timeConflicts.length} appointment{timeConflicts.length > 1 ? 's' : ''})
                        </p>
                        <div className="space-y-1">
                          {timeConflicts.map((conflict, index) => (
                            <div key={conflict.id} className="text-sm flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {conflict.patient_name} - {format(conflict.start_time, "h:mm a")} to {format(conflict.end_time, "h:mm a")}
                                {conflict.provider_name && ` (${conflict.provider_name})`}
                                {conflict.status === "overbook" && (
                                  <Badge variant="outline" className="text-xs ml-1 text-blue-600">
                                    Overbook
                                  </Badge>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm">
                          Please choose a different time slot or create an overbook appointment to proceed.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Overbook Conflict Info */}
                {isOverbook && timeConflicts.length > 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="space-y-2">
                        <p className="font-medium">
                          Overbook Appointment - Scheduling Beyond Capacity
                        </p>
                        <p className="text-sm">
                          This overbook appointment will be scheduled alongside {timeConflicts.length} existing appointment{timeConflicts.length > 1 ? 's' : ''} to compensate for potential no-shows.
                        </p>
                        <div className="space-y-1">
                          {timeConflicts.slice(0, 3).map((conflict, index) => (
                            <div key={conflict.id} className="text-sm flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {conflict.patient_name} - {format(conflict.start_time, "h:mm a")}
                                {conflict.status === "overbook" && (
                                  <Badge variant="outline" className="text-xs ml-1 text-blue-600">
                                    Overbook
                                  </Badge>
                                )}
                              </span>
                            </div>
                          ))}
                          {timeConflicts.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              ...and {timeConflicts.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Duration and Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Duration *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {durations.map((duration) => (
                              <SelectItem key={duration.value} value={duration.value}>
                                {duration.label}
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
                    name="appointmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {appointmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Provider Selection */}
                <FormField
                  control={form.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Healthcare Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select a provider (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers?.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={isOverbook 
                            ? "OVERBOOK: Scheduled to compensate for potential no-shows. Add any additional notes..."
                            : "Add any additional notes or special instructions..."
                          }
                          className="resize-none text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Availability Summary */}
                {watchedValues.appointmentDate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Availability for {format(watchedValues.appointmentDate, "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {timeSlotData.filter(slot => slot.available).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Booked:</span>
                        <span className="ml-2 font-medium text-red-600">
                          {timeSlotData.filter(slot => !slot.available).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Appointments:</span>
                        <span className="ml-2 font-medium">
                          {timeSlotData.reduce((sum, slot) => sum + slot.appointments.length, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Overbooks:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          {timeSlotData.reduce((sum, slot) => sum + slot.overbookCount, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || (timeConflicts.length > 0 && !isOverbook)} 
                    className="w-full sm:w-auto" 
                    size="sm"
                  >
                    {loading 
                      ? (isOverbook ? "Creating Overbook..." : "Creating...") 
                      : (isOverbook ? "Create Overbook Appointment" : "Create Appointment")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            {watchedValues.appointmentDate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Schedule for {format(watchedValues.appointmentDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                      <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>Overbook</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {timeSlotData.map((slot) => (
                    <div
                      key={slot.time}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        slot.available 
                          ? "bg-green-50 border-green-200 hover:bg-green-100" 
                          : "bg-red-50 border-red-200",
                        watchedValues.appointmentTime === slot.time && "ring-2 ring-primary"
                      )}
                      onClick={() => handleTimeSlotClick(slot.time)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{slot.time}</span>
                        <div className="flex items-center gap-1">
                          {slot.available ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          {slot.overbookCount > 0 && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              +{slot.overbookCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {slot.appointments.length > 0 && (
                        <div className="space-y-1">
                          {slot.appointments.slice(0, 2).map((appointment, index) => (
                            <div key={appointment.id} className="text-xs text-muted-foreground">
                              <div className="font-medium">{appointment.patient_name}</div>
                              <div className="flex items-center gap-1">
                                <span>{appointment.appointment_type}</span>
                                {appointment.provider_name && (
                                  <span>• {appointment.provider_name}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {slot.appointments.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{slot.appointments.length - 2} more
                            </div>
                          )}
                        </div>
                      )}

                      {slot.available && (
                        <div className="text-xs text-green-600 mt-2">
                          Click to select this time
                        </div>
                      )}

                      {!slot.available && isOverbook && (
                        <div className="text-xs text-blue-600 mt-2">
                          Available for overbook
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-muted-foreground">
                  Click on any time slot to select it for your appointment. 
                  {isOverbook && " As an overbook appointment, you can select any time slot, even if it's already booked."}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Please select a date first to view the schedule
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentDialog;