import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 lg:ml-64">
        <Header />
        <main className="flex-1 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;