-- Create super user admin@clinicflow.com
DO $$
DECLARE
    admin_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    -- Insert or update the admin user in auth.users
    INSERT INTO auth.users (
        id, 
        instance_id, 
        aud, 
        role, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        created_at, 
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_confirmed_at,
        phone_confirmed_at
    ) VALUES (
        admin_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@clinicflow.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"], "role": "super_admin"}',
        '{"role": "super_admin", "is_admin": true}',
        true,
        '',
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = true,
        email_confirmed_at = now(),
        phone_confirmed_at = now(),
        updated_at = now();

    -- Also ensure the email is unique by checking for duplicates
    DELETE FROM auth.users 
    WHERE email = 'admin@clinicflow.com' 
    AND id != admin_user_id;

    -- Insert identity record for email authentication
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        admin_user_id,
        jsonb_build_object(
            'email', 'admin@clinicflow.com',
            'sub', admin_user_id::text
        ),
        'email',
        now(),
        now(),
        now()
    ) ON CONFLICT (provider, user_id) DO UPDATE SET
        identity_data = EXCLUDED.identity_data,
        last_sign_in_at = now(),
        updated_at = now();

    RAISE NOTICE 'Super user admin@clinicflow.com created/updated with ID: %', admin_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating super user: %', SQLERRM;
END $$;

-- Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'is_super_admin')::boolean,
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    ),
    false
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if the current user is a super admin';