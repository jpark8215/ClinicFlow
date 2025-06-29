import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./components/auth/AuthProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import SchedulePage from "./pages/Schedule";
import PriorAuthorizationPage from "./pages/PriorAuthorization";
import IntakePage from "./pages/Intake";
import PatientsPage from "./pages/Patients";
import InsuranceEligibilityPage from "./pages/InsuranceEligibility";
import SettingsPage from "./pages/Settings";
import TodaysAppointmentsPage from "./pages/TodaysAppointments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/preauth" element={<PriorAuthorizationPage />} />
              <Route path="/intake" element={<IntakePage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/insurance-eligibility" element={<InsuranceEligibilityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/appointments/today" element={<TodaysAppointmentsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;