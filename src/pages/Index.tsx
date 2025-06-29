import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import InsuranceEligibilityCard from "@/components/dashboard/InsuranceEligibilityCard";
import PreauthCard from "@/components/dashboard/PreauthCard";
import DummyDataLoader from "@/components/utils/DummyDataLoader";
import { Skeleton } from "@/components/ui/skeleton";

const checkForData = async () => {
  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id")
    .limit(1);

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id")
    .limit(1);

  if (patientsError || appointmentsError) {
    throw new Error("Failed to check for existing data");
  }

  return {
    hasPatients: patients && patients.length > 0,
    hasAppointments: appointments && appointments.length > 0,
    hasData: (patients && patients.length > 0) || (appointments && appointments.length > 0)
  };
};

const Index = () => {
  const { data: dataCheck, isLoading, error } = useQuery({
    queryKey: ["dataCheck"],
    queryFn: checkForData,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
        <div className="xl:col-span-1 space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Show data loader if no data exists
  if (!dataCheck?.hasData) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to ClinicFlow</h2>
            <p className="text-muted-foreground mb-6">
              Get started by loading some test data to explore the dashboard features.
            </p>
          </div>
          <DummyDataLoader />
        </div>
      </div>
    );
  }

  // Show normal dashboard with data
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
      <div className="xl:col-span-1 space-y-6">
        <AppointmentsCard />
        <PreauthCard />
        <InsuranceEligibilityCard />
      </div>
      <div className="xl:col-span-1 space-y-6">
        <NoShowRiskCard />
        <IntakeCard />
      </div>
    </div>
  );
};

export default Index;