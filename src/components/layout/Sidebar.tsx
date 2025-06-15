
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  FileText,
  Gauge,
  LogOut,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../ui/use-toast";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/schedule", label: "Smart Scheduling", icon: Calendar },
  { href: "/preauth", label: "Preauth Bot", icon: FileText },
  { href: "/intake", label: "Intake Automation", icon: UserPlus },
  { href: "/patients", label: "Patient List", icon: Users },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r fixed h-full">
      <div className="flex items-center h-16 px-6 border-b">
        <h1 className="text-xl font-bold text-primary">ClinicFlow</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="h-4 w-4" />
              Settings
          </Button>
           <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Log Out
          </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
