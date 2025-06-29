import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import InsuranceEligibilityCard from "@/components/dashboard/InsuranceEligibilityCard";
import PreauthCard from "@/components/dashboard/PreauthCard";
import { InsertDummyDataButton } from "@/components/ui/insert-dummy-data-button";

const Index = () => {
  return (
    <div className="space-y-6">
      {/* Add the dummy data button at the top */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your healthcare management dashboard</p>
        </div>
        <InsertDummyDataButton />
      </div>
      
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
    </div>
  );
};

export default Index;