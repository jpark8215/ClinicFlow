
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { appointments } from "@/lib/dummy-data";
import { Calendar, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AppointmentsCard = () => {
  const statusColors = {
    Confirmed: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>You have {appointments.length} appointments today.</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {appointments.map((appt) => (
            <li key={appt.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{appt.patient.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{appt.patient.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {appt.time}
                  </p>
                </div>
              </div>
              <Badge className={statusColors[appt.status]}>{appt.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default AppointmentsCard;
