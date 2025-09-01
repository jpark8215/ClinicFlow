import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, UserPlus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

type IntakeTaskWithPatient = Tables<"intake_tasks"> & {
  patients: Pick<Tables<"patients">, "full_name"> | null;
};

const fetchIntakeTasks = async () => {
  const { data, error } = await supabase
    .from("intake_tasks")
    .select("*, patients (full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const IntakeCard = () => {
  const navigate = useNavigate();
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery<IntakeTaskWithPatient[]>({
    queryKey: ["intakeTasks"],
    queryFn: fetchIntakeTasks,
  });

  const statusColors: Record<Tables<"intake_tasks">["status"], string> = {
    "Pending OCR": "bg-purple-100 text-purple-800",
    "Needs Validation": "bg-orange-100 text-orange-800",
    Complete: "bg-gray-100 text-gray-800",
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
              <Skeleton className="h-6 w-[120px] rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <p className="text-sm text-red-500">Error loading intake tasks.</p>
      );
    }

    if (!tasks || tasks.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No intake tasks found.
        </p>
      );
    }

    return (
      <ul className="space-y-4">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-purple-50 text-purple-600">
                  <UserPlus className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{task.patients?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {task.task_description}
                </p>
              </div>
            </div>
            <Badge className={statusColors[task.status]} variant="outline">
              {task.status}
            </Badge>
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
            <CardTitle>Intake Automation Queue</CardTitle>
            <CardDescription>Tasks needing attention</CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        {tasks && tasks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={() => navigate("/intake")}
            >
              View All Intake Tasks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntakeCard;