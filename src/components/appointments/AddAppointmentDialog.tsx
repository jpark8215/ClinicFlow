import { useState } from "react";
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
import { CalendarIcon, Plus, UserPlus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const AddAppointmentDialog = ({ onSuccess, defaultDate, isOverbook = false }: AddAppointmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (data: AppointmentFormData) => {
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
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["todaysAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] });
      
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
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
                <strong>Overbook Strategy:</strong> This appointment is scheduled beyond normal capacity to compensate for expected no-shows.
              </div>
            </div>
          )}
        </DialogHeader>

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
                    <FormLabel className="text-sm">Time *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={loading} className="w-full sm:w-auto" size="sm">
                {loading 
                  ? (isOverbook ? "Creating Overbook..." : "Creating...") 
                  : (isOverbook ? "Create Overbook Appointment" : "Create Appointment")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentDialog;