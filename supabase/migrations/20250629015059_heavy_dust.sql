/*
  # Insert existing auth users into public users table

  1. New Function
    - `sync_auth_users_to_public()` - Syncs existing auth.users to public.users
  
  2. Data Migration
    - Inserts all existing auth.users into public.users table
    - Handles duplicates gracefully
    - Preserves existing data
  
  3. Trigger Enhancement
    - Ensures the existing trigger works properly for new signups
*/

-- Function to sync existing auth users to public users table
CREATE OR REPLACE FUNCTION public.sync_auth_users_to_public()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_count INTEGER := 0;
    updated_count INTEGER := 0;
    auth_user RECORD;
BEGIN
    -- Loop through all auth users and ensure they exist in public.users
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data, created_at, updated_at
        FROM auth.users
    LOOP
        -- Try to insert or update the user in public.users
        INSERT INTO public.users (id, email, full_name, created_at, updated_at)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.raw_user_meta_data->>'name'),
            auth_user.created_at,
            auth_user.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, users.full_name),
            updated_at = EXCLUDED.updated_at
        WHERE users.email != EXCLUDED.email 
           OR users.full_name IS DISTINCT FROM EXCLUDED.full_name;
        
        -- Check if this was an insert or update
        IF FOUND THEN
            IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user.id AND created_at = auth_user.created_at) THEN
                inserted_count := inserted_count + 1;
            ELSE
                updated_count := updated_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN format('Sync completed: %s users inserted, %s users updated', inserted_count, updated_count);
END;
$$;

-- Ensure the handle_new_user function exists and works correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Also create a trigger for updates to auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users SET
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', users.full_name),
        updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_update();

-- Run the sync function to insert existing auth users
SELECT public.sync_auth_users_to_public();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sync_auth_users_to_public() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.sync_auth_users_to_public() IS 'Syncs all existing auth.users to public.users table';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates public.users record when auth.users record is created';
COMMENT ON FUNCTION public.handle_auth_user_update() IS 'Automatically updates public.users record when auth.users record is updated';