import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ClinicFlow - Your comprehensive clinic management system</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+15 this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Intake & authorizations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Tasks & appointments</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your clinic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <FileText className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">New patient intake completed</p>
                  <p className="text-xs text-muted-foreground">Sarah Johnson - 2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Prior authorization pending</p>
                  <p className="text-xs text-muted-foreground">Michael Smith - 15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Insurance verification completed</p>
                  <p className="text-xs text-muted-foreground">Emily Davis - 1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/patients')}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">Add Patient</span>
              </button>
              <button 
                onClick={() => navigate('/schedule')}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm">Schedule Appointment</span>
              </button>
              <button 
                onClick={() => navigate('/intake')}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">Process Intake</span>
              </button>
              <button 
                onClick={() => navigate('/prior-authorization')}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <AlertTriangle className="h-6 w-6 mb-2" />
                <span className="text-sm">Prior Auth</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;