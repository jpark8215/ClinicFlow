import { Search, Bell, LogOut, Settings as SettingsIcon, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (email: string | undefined) => {
    if (!email) return "U";
    const parts = email.split("@")[0];
    return parts.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth");
    }
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const handleDashboard = () => {
    navigate("/");
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/schedule":
        return "Smart Scheduling";
      case "/preauth":
        return "Prior Authorization";
      case "/intake":
        return "Intake Automation";
      case "/patients":
        return "Patient List";
      case "/insurance-eligibility":
        return "Insurance Eligibility";
      case "/settings":
        return "Settings";
      default:
        return "Dashboard";
    }
  };

  const isOnDashboard = location.pathname === "/";

  return (
    <header className="flex items-center h-16 px-6 border-b bg-card">
      <div className="flex items-center gap-4 flex-1">
        {!isOnDashboard && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDashboard}
            className="flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/10"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        )}
        <div className="flex items-center gap-2">
          {!isOnDashboard && <span className="text-muted-foreground">•</span>}
          <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9" />
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Account</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isOnDashboard && (
              <>
                <DropdownMenuItem onClick={handleDashboard}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleSettings}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;