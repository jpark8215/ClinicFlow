import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

const fetchPreAuthorizations = async () => {
  const { data, error } = await supabase
    .from("pre_authorizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const PreauthCard = () => {
  const navigate = useNavigate();
  const {
    data: preAuthorizations,
    isLoading,
    error,
  } = useQuery<Tables<"pre_authorizations">[]>({
    queryKey: ["preAuthorizations"],
    queryFn: fetchPreAuthorizations,
  });

  const statusColors: Record<
    Tables<"pre_authorizations">["status"],
    string
  > = {
    Approved: "bg-blue-100 text-blue-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Denied: "bg-red-100 text-red-800",
    Submitted: "bg-orange-100 text-orange-800",
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
        <p className="text-sm text-red-500">
          Error loading pre-authorizations.
        </p>
      );
    }

    if (!preAuthorizations || preAuthorizations.length === 0) {
      return <p className="text-sm text-muted-foreground">No prior authorizations found.</p>;
    }

    return (
      <ul className="space-y-4">
        {preAuthorizations.map((auth) => (
          <li key={auth.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{auth.patient_name}</p>
                <p className="text-sm text-muted-foreground">
                  {auth.service}
                </p>
              </div>
            </div>
            <Badge className={statusColors[auth.status]}>
              {auth.status}
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
            <CardTitle>Prior Authorizations</CardTitle>
            <CardDescription>Status of recent requests</CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        {preAuthorizations && preAuthorizations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={() => navigate("/preauth")}
            >
              View All Prior Authorizations
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreauthCard;