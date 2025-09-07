import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Calendar,
  FileText,
  Gauge,
  LogOut,
  Settings,
  UserPlus,
  Users,
  Shield,
  FileCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "../ui/use-toast";
import { useAuth } from "../auth/AuthProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/schedule", label: "Smart Scheduling", icon: Calendar },
  { href: "/prior-authorization", label: "Prior Authorization", icon: FileText },
  { href: "/insurance-eligibility", label: "Insurance Eligibility", icon: Shield },
  { href: "/intake", label: "Intake Automation", icon: UserPlus },
  { href: "/patients", label: "Patient List", icon: Users },
  { href: "/documents", label: "Documents", icon: FileCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();

  const handleLogout = async () => {
    const { error } = await signOut();
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border bg-background">
      <SidebarHeader className="border-b border-border bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Gauge className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">ClinicFlow</span>
                  <span className="truncate text-xs text-muted-foreground">Healthcare Management</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 bg-background">
        <SidebarGroup>
{/*           <SidebarGroupLabel className="text-muted-foreground font-semibold mb-2">Navigation</SidebarGroupLabel> */}
          <SidebarGroupContent> 
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="w-full justify-start text-foreground hover:bg-muted hover:text-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <NavLink to={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors">
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border mt-auto bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Log Out"
            >
              <LogOut className="size-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};


export default AppSidebar;
