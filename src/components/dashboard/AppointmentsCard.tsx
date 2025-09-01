import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

type AppointmentWithPatient = Tables<"appointments"> & {
  patients: Pick<Tables<"patients">, "full_name"> | null;
};

const fetchAppointments = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("*, patients (full_name)")
    .gte("appointment_time", startOfDay)
    .lte("appointment_time", endOfDay)
    .order("appointment_time", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
};

const AppointmentsCard = () => {
  const navigate = useNavigate();
  const {
    data: appointments,
    isLoading,
    error,
  } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const statusColors: Record<Tables<"appointments">["status"], string> = {
    Confirmed: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Cancelled: "bg-red-100 text-red-800",
    Completed: "bg-gray-100 text-gray-800",
    "No-Show": "bg-rose-100 text-rose-800",
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
              <Skeleton className="h-6 w-[80px] rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <p className="text-sm text-red-500">Error loading appointments.</p>
      );
    }

    if (!appointments || appointments.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No appointments found for today.
        </p>
      );
    }

    return (
      <ul className="space-y-4">
        {appointments.map((appt) => (
          <li key={appt.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {appt.patients ? getInitials(appt.patients.full_name) : "???"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{appt.patients?.full_name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(appt.appointment_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <Badge className={statusColors[appt.status]}>{appt.status}</Badge>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading..."
                : `You have ${
                    appointments?.length || 0
                  } appointments today.`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        {appointments && appointments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={() => navigate("/appointments/today")}
            >
              View All Today's Appointments
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsCard;