
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import { Skeleton } from "../ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-8 w-[200px]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

export default ProtectedRoute;
