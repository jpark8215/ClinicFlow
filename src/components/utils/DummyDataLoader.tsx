import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Database, CheckCircle } from "lucide-react";

const DummyDataLoader = () => {
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { toast } = useToast();

  const loadDummyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('insert_dummy_data', {});
      
      if (error) {
        throw error;
      }

      if (data?.includes('SUCCESS')) {
        setDataLoaded(true);
        toast({
          title: "Success!",
          description: "Dummy data has been loaded successfully. You should now see data in your dashboard.",
        });
      } else if (data?.includes('INFO')) {
        toast({
          title: "Info",
          description: "You already have data in your account.",
        });
      } else {
        throw new Error(data || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error loading dummy data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dummy data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          {dataLoaded ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : (
            <Database className="h-12 w-12 text-blue-500" />
          )}
        </div>
        <CardTitle>Load Test Data</CardTitle>
        <CardDescription>
          {dataLoaded 
            ? "Test data has been loaded successfully!"
            : "Populate your account with realistic test data for development and testing."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={loadDummyData} 
          disabled={loading || dataLoaded}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {dataLoaded ? "Data Loaded" : "Load Dummy Data"}
        </Button>
        {!dataLoaded && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will create 8 patients, 5 providers, 8 appointments, and other test records.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DummyDataLoader;