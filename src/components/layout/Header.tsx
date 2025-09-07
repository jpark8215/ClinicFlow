import { Bell, LogOut, Settings as SettingsIcon, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import NotificationPopover from "./NotificationPopover";

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


  const handleDashboard = () => {
    navigate("/");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const isOnDashboard = location.pathname === "/";

  return (
    <header className="flex items-center h-14 sm:h-16 px-3 sm:px-6 border-b bg-card">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="lg:hidden" />
        <div className="flex-1">
          <h1 className="text-lg sm:text-l font-bold text-primary">ClinicFlow</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationPopover />
        
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="text-xs sm:text-sm">{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Account</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
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
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
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



