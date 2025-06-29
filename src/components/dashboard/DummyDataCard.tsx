import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const DummyDataCard = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const insertDummyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('insert_dummy_data');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: data || "Dummy data inserted successfully",
      });

      // Invalidate all queries to refresh the dashboard
      queryClient.invalidateQueries();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to insert dummy data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data
        </CardTitle>
        <CardDescription>
          Insert realistic dummy data for testing and development
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>This will create:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>8 patients with complete profiles</li>
              <li>5 healthcare providers</li>
              <li>8 appointments (various statuses)</li>
              <li>6 prior authorizations</li>
              <li>6 intake tasks</li>
              <li>8 insurance eligibility records</li>
              <li>Document templates and patient documents</li>
              <li>Notifications and audit logs</li>
            </ul>
          </div>
          
          <Button 
            onClick={insertDummyData} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inserting Data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Insert Dummy Data
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DummyDataCard;