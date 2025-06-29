import { supabase } from "@/integrations/supabase/client";

export const insertDummyData = async () => {
  try {
    console.log("Starting dummy data insertion...");
    
    // Call the insert_dummy_data function
    const { data, error } = await supabase.rpc('insert_dummy_data');
    
    if (error) {
      console.error("Error inserting dummy data:", error);
      throw error;
    }
    
    console.log("Dummy data insertion result:", data);
    return { success: true, message: data };
  } catch (error) {
    console.error("Failed to insert dummy data:", error);
    return { success: false, error: error.message };
  }
};