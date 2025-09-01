-- Create super user admin@clinicflow.com
DO $$
DECLARE
    admin_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    user_exists BOOLEAN;
    identity_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = admin_user_id) INTO user_exists;
    
    IF user_exists THEN
        -- Update existing user
        UPDATE auth.users SET
            email = 'admin@clinicflow.com',
            encrypted_password = crypt('admin123', gen_salt('bf')),
            raw_app_meta_data = '{"provider": "email", "providers": ["email"], "role": "super_admin"}',
            raw_user_meta_data = '{"role": "super_admin", "is_admin": true}',
            is_super_admin = true,
            email_confirmed_at = now(),
            phone_confirmed_at = now(),
            updated_at = now()
        WHERE id = admin_user_id;
    ELSE
        -- Insert new user
        INSERT INTO auth.users (
            id, 
            instance_id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            phone_confirmed_at,
            created_at, 
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token
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
            now(),
            '{"provider": "email", "providers": ["email"], "role": "super_admin"}',
            '{"role": "super_admin", "is_admin": true}',
            true,
            ''
        );
    END IF;

    -- Remove any duplicate users with the same email but different ID
    DELETE FROM auth.users 
    WHERE email = 'admin@clinicflow.com' 
    AND id != admin_user_id;

    -- Check if identity already exists
    SELECT EXISTS(
        SELECT 1 FROM auth.identities 
        WHERE provider = 'email' AND user_id = admin_user_id
    ) INTO identity_exists;

    IF identity_exists THEN
        -- Update existing identity
        UPDATE auth.identities SET
            identity_data = jsonb_build_object(
                'email', 'admin@clinicflow.com',
                'sub', admin_user_id::text
            ),
            provider_id = 'admin@clinicflow.com',
            last_sign_in_at = now(),
            updated_at = now()
        WHERE provider = 'email' AND user_id = admin_user_id;
    ELSE
        -- Insert new identity record for email authentication
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
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
            'admin@clinicflow.com',
            now(),
            now(),
            now()
        );
    END IF;

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