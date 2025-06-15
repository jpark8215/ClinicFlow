
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, UserPlus } from "lucide-react";
import { intakeTasks } from "@/lib/dummy-data";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const IntakeCard = () => {
  const statusColors = {
    "Pending OCR": "bg-purple-100 text-purple-800",
    "Needs Validation": "bg-orange-100 text-orange-800",
    "Complete": "bg-gray-100 text-gray-800",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Intake Automation Queue</CardTitle>
                <CardDescription>Tasks needing attention</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {intakeTasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Avatar>
                  <AvatarFallback className="bg-purple-50 text-purple-600">
                    <UserPlus className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{task.patient.name}</p>
                  <p className="text-sm text-muted-foreground">{task.task}</p>
                </div>
              </div>
              <Badge className={statusColors[task.status]} variant="outline">{task.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default IntakeCard;
