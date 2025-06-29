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
import { Tables, Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

type EligibilityWithPatient = Tables<"insurance_eligibility"> & {
  patients: Pick<Tables<"patients">, "full_name"> | null;
};

const fetchInsuranceEligibility = async () => {
  const { data, error } = await supabase
    .from("insurance_eligibility")
    .select("*, patients (full_name)")
    .order("verification_date", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const InsuranceEligibilityCard = () => {
  const navigate = useNavigate();
  const {
    data: checks,
    isLoading,
    error,
  } = useQuery<EligibilityWithPatient[]>({
    queryKey: ["insuranceEligibility"],
    queryFn: fetchInsuranceEligibility,
  });

  const statusColors: Record<Enums<"eligibility_status">, string> = {
    Eligible: "bg-green-100 text-green-800",
    Ineligible: "bg-red-100 text-red-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Error: "bg-gray-100 text-gray-800",
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
          Error loading eligibility checks.
        </p>
      );
    }

    if (!checks || checks.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No eligibility checks found.
        </p>
      );
    }

    return (
      <ul className="space-y-4">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{check.patients?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {check.payer_name} - Verified{" "}
                  {format(new Date(check.verification_date), "PP")}
                </p>
              </div>
            </div>
            <Badge className={statusColors[check.status]}>{check.status}</Badge>
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
            <CardTitle>Insurance Eligibility</CardTitle>
            <CardDescription>Recent verification checks</CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
        {checks && checks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={() => navigate("/insurance-eligibility")}
            >
              View All Eligibility Checks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsuranceEligibilityCard;