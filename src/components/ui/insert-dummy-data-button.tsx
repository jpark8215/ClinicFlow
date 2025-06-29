import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Database } from "lucide-react";

export const InsertDummyDataButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const insertDummyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('insert_dummy_data');
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success!",
        description: data,
      });
      
      // Refresh the page to see new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={insertDummyData} 
      disabled={loading}
      className="gap-2"
      variant="outline"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {loading ? "Inserting Data..." : "Insert Dummy Data"}
    </Button>
  );
};