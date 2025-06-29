import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import InsuranceEligibilityCard from "@/components/dashboard/InsuranceEligibilityCard";
import PreauthCard from "@/components/dashboard/PreauthCard";
import InsertDummyDataButton from "@/components/InsertDummyDataButton";

const Index = () => {
  return (
    <div className="space-y-6">
      <InsertDummyDataButton />
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