import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import InsuranceEligibilityCard from "@/components/dashboard/InsuranceEligibilityCard";
import PreauthCard from "@/components/dashboard/PreauthCard";

const Index = () => {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="space-y-4 sm:space-y-6">
        <AppointmentsCard />
        <PreauthCard />
        <InsuranceEligibilityCard />
      </div>
      <div className="space-y-4 sm:space-y-6">
        <NoShowRiskCard />
        <IntakeCard />
      </div>
    </div>
  );
};

export default Index;