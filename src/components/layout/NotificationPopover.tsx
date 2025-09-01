import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

type NotificationType = Tables<"notifications">;

const NotificationPopover = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery<NotificationType[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Filter notifications by status
  const unreadNotifications = notifications?.filter(n => n.status === "unread") || [];
  const readNotifications = notifications?.filter(n => n.status === "read") || [];
  const archivedNotifications = notifications?.filter(n => n.status === "archived") || [];

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ 
          status: "read",
          read_at: new Date().toISOString()
        })
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  });

  // Mark notification as archived
  const archiveNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "archived" })
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive notification",
        variant: "destructive",
      });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || unreadNotifications.length === 0) return;
      
      const { error } = await supabase
        .from("notifications")
        .update({ 
          status: "read",
          read_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("status", "unread");
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  });

  // Get notification icon based on type
  const getNotificationIcon = (type: Enums<"notification_type">) => {
    switch (type) {
      case "appointment_reminder":
        return "🗓️";
      case "document_required":
        return "📄";
      case "eligibility_check":
        return "🛡️";
      case "preauth_update":
        return "📋";
      case "system_alert":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  // Format notification time
  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: NotificationType) => {
    // If notification is unread, mark it as read
    if (notification.status === "unread") {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Handle navigation based on notification type and related entity
    if (notification.related_table && notification.related_id) {
      // In a real app, this would navigate to the relevant page
      console.log(`Navigate to ${notification.related_table}/${notification.related_id}`);
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: NotificationType) => (
    <div 
      key={notification.id}
      className="p-3 hover:bg-muted rounded-md cursor-pointer transition-colors"
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex gap-3">
        <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNotificationTime(notification.created_at || "")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  archiveNotificationMutation.mutate(notification.id);
                }}
              >
                <span className="sr-only">Archive</span>
                <span className="text-xs">×</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
        </div>
      </div>
    </div>
  );

  // Render notification list
  const renderNotificationList = (notifications: NotificationType[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {notifications.map(renderNotificationItem)}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadNotifications.length > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              <span className="text-[10px]">
                {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
              </span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadNotifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => markAllAsReadMutation.mutate()}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="unread" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="unread" className="flex-1 text-xs">
                Unread
                {unreadNotifications.length > 0 && (
                  <Badge className="ml-2 h-5 px-1">{unreadNotifications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="flex-1 text-xs">
                Read
                {readNotifications.length > 0 && (
                  <Badge variant="outline" className="ml-2 h-5 px-1">{readNotifications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1 text-xs">
                Archived
              </TabsTrigger>
            </TabsList>
          </div>
          
          <Separator className="my-2" />
          
          <TabsContent value="unread" className="m-0">
            {renderNotificationList(unreadNotifications, "No unread notifications")}
          </TabsContent>
          
          <TabsContent value="read" className="m-0">
            {renderNotificationList(readNotifications, "No read notifications")}
          </TabsContent>
          
          <TabsContent value="archived" className="m-0">
            {renderNotificationList(archivedNotifications, "No archived notifications")}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover;