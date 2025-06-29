import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import InsuranceEligibilityCard from "@/components/dashboard/InsuranceEligibilityCard";
import PreauthCard from "@/components/dashboard/PreauthCard";
import DummyDataCard from "@/components/dashboard/DummyDataCard";

const Index = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <div className="xl:col-span-1 space-y-6">
        <AppointmentsCard />
        <PreauthCard />
      </div>
      <div className="xl:col-span-1 space-y-6">
        <NoShowRiskCard />
        <IntakeCard />
      </div>
      <div className="xl:col-span-1 space-y-6">
        <InsuranceEligibilityCard />
        <DummyDataCard />
      </div>
    </div>
  );
};

export default Index;