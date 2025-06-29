import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User, Bell, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Schema for password change
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for profile update
const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

// Schema for notification preferences
const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  appointmentReminders: z.boolean(),
  preauthUpdates: z.boolean(),
  systemAlerts: z.boolean(),
});

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: user?.email || "",
    },
  });

  // Notification preferences form
  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      appointmentReminders: true,
      preauthUpdates: true,
      systemAlerts: true,
    },
  });

  const handlePasswordChange = async (values: z.infer<typeof passwordSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) {
        toast({
          title: "Error updating password",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated successfully",
          description: "Your password has been changed.",
        });
        passwordForm.reset();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleProfileUpdate = async (values: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      // Update auth user email if changed
      if (values.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: values.email
        });
        
        if (emailError) {
          toast({
            title: "Error updating email",
            description: emailError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Update user profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: values.fullName,
          email: values.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) {
        toast({
          title: "Error updating profile",
          description: profileError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile updated successfully",
          description: "Your profile information has been saved.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleNotificationUpdate = async (values: z.infer<typeof notificationSchema>) => {
    setLoading(true);
    try {
      // Update user preferences in the database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          email_notifications: values.emailNotifications,
          appointment_reminders: values.appointmentReminders,
          preauth_updates: values.preauthUpdates,
          system_alerts: values.systemAlerts,
          updated_at: new Date().toISOString()
        });

      if (error) {
        toast({
          title: "Error updating preferences",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Notification preferences updated",
          description: "Your notification settings have been saved.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 max-w-4xl">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
              <CardDescription className="text-sm">
                Update your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto">
                    {loading ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Account Information</CardTitle>
              <CardDescription className="text-sm">
                View your account details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">User ID</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all">{user?.id}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Account Created</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Email Verified</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {user?.email_confirmed_at ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Last Sign In</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Change Password</CardTitle>
              <CardDescription className="text-sm">
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto">
                    {loading ? "Updating..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Two-Factor Authentication</CardTitle>
              <CardDescription className="text-sm">
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <Label htmlFor="2fa" className="text-sm">Enable Two-Factor Authentication</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Secure your account with SMS or authenticator app
                    </p>
                  </div>
                  <Switch id="2fa" />
                </div>
                <Button variant="outline" disabled size="sm" className="w-full sm:w-auto">
                  Configure 2FA (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
              <CardDescription className="text-sm">
                Choose what notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(handleNotificationUpdate)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <FormLabel className="text-sm">Email Notifications</FormLabel>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Receive notifications via email
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={notificationForm.control}
                      name="appointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <FormLabel className="text-sm">Appointment Reminders</FormLabel>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Get notified about upcoming appointments
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="preauthUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <FormLabel className="text-sm">Prior Authorization Updates</FormLabel>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Receive updates on authorization status
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="systemAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <FormLabel className="text-sm">System Alerts</FormLabel>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Important system notifications and maintenance
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto">
                    {loading ? "Saving..." : "Save Preferences"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;