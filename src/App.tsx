
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
            <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                {/* Placeholder routes for navigation */}
                <Route path="/schedule" element={<div className="text-center p-8">Smart Scheduling Page - Coming Soon!</div>} />
                <Route path="/preauth" element={<div className="text-center p-8">Preauth Bot Page - Coming Soon!</div>} />
                <Route path="/intake" element={<div className="text-center p-8">Intake Automation Page - Coming Soon!</div>} />
                <Route path="/patients" element={<div className="text-center p-8">Patient List Page - Coming Soon!</div>} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
