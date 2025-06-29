import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { insertDummyData } from "@/lib/insertDummyData";
import { Loader2 } from "lucide-react";

const InsertDummyDataButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInsertData = async () => {
    setLoading(true);
    try {
      const result = await insertDummyData();
      
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        // Refresh the page to show new data
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to insert dummy data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleInsertData} 
      disabled={loading}
      className="mb-6"
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? "Inserting Data..." : "Insert Dummy Data"}
    </Button>
  );
};

export default InsertDummyDataButton;