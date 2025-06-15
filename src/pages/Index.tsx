
import AppointmentsCard from "@/components/dashboard/AppointmentsCard";
import IntakeCard from "@/components/dashboard/IntakeCard";
import NoShowRiskCard from "@/components/dashboard/NoShowRiskCard";
import PreauthCard from "@/components/dashboard/PreauthCard";

const Index = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
      <div className="xl:col-span-1 space-y-6">
        <AppointmentsCard />
        <PreauthCard />
      </div>
      <div className="xl:col-span-1 space-y-6">
        <NoShowRiskCard />
        <IntakeCard />
      </div>
    </div>
  );
};

export default Index;
