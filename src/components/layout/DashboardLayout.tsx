import React from "react";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 p-3 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;