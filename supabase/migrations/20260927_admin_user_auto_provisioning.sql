-- =========================================================================
-- FINORA DATABASE MIGRATION: 20260927_admin_user_auto_provisioning.sql
-- Governed by Chapters 008, 009, 027, 057, 137, 234, 250.
-- Designates davoodmehraban89@gmail.com as Platform Super Admin / Owner.
-- Automatically provisions full admin privileges and wildcard permissions upon registration.
-- =========================================================================

-- 1. Table for designated platform super administrators
CREATE TABLE IF NOT EXISTS public.platform_super_admins (
    email VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) DEFAULT 'داوود مهربان' NOT NULL,
    notes TEXT DEFAULT 'مدیر کل و مالک سامانه فینورا' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed designated super admin
INSERT INTO public.platform_super_admins (email, full_name, notes)
VALUES ('davoodmehraban89@gmail.com', 'داوود مهربان', 'مدیر کل و مالک پلتفرم یکپارچه مالی فینورا')
ON CONFLICT (email) DO NOTHING;

-- 2. Security Definer helper to verify if an email has super admin status
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(check_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.platform_super_admins 
    WHERE LOWER(email) = LOWER(TRIM(check_email))
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 3. Automatic Provisioning Trigger on auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
    default_org_id UUID;
    is_admin BOOLEAN := false;
BEGIN
    -- Check if newly created user is in platform_super_admins
    SELECT public.is_platform_super_admin(NEW.email) INTO is_admin;

    -- Ensure default tenant exists
    SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (id, name, subdomain)
        VALUES ('11111111-1111-1111-1111-111111111111', 'هلدینگ مرکزی فینورا', 'tehran-hq')
        RETURNING id INTO default_tenant_id;
    END IF;

    -- Ensure default organization exists
    SELECT id INTO default_org_id FROM public.organizations WHERE tenant_id = default_tenant_id LIMIT 1;
    IF default_org_id IS NULL THEN
        INSERT INTO public.organizations (id, tenant_id, legal_name, national_id, economic_code)
        VALUES ('22222222-2222-2222-2222-222222222222', default_tenant_id, 'شرکت پلتفرم مالی فینورا', '10101010101', '411111111111')
        RETURNING id INTO default_org_id;
    END IF;

    -- If this user is the designated admin, provision with full Owner & Super Admin privileges
    IF is_admin THEN
        INSERT INTO public.organization_members (
            tenant_id,
            organization_id,
            user_id,
            role,
            permissions,
            is_active
        )
        VALUES (
            default_tenant_id,
            default_org_id,
            NEW.id,
            'owner',
            '["*","super_admin","finance_manager","hr_manager","procurement_manager","holding_auditor"]'::jsonb,
            true
        )
        ON CONFLICT (organization_id, user_id) 
        DO UPDATE SET 
            role = 'owner',
            permissions = '["*","super_admin","finance_manager","hr_manager","procurement_manager","holding_auditor"]'::jsonb,
            is_active = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users (works automatically when user registers via Supabase Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();

-- 4. Retroactive check: If user already exists in auth.users, upgrade immediately
DO $$
DECLARE
    existing_user_id UUID;
    default_tenant_id UUID;
    default_org_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        SELECT id INTO existing_user_id FROM auth.users WHERE LOWER(email) = 'davoodmehraban89@gmail.com' LIMIT 1;
        IF existing_user_id IS NOT NULL THEN
            SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
            SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

            IF default_tenant_id IS NOT NULL AND default_org_id IS NOT NULL THEN
                INSERT INTO public.organization_members (
                    tenant_id, organization_id, user_id, role, permissions, is_active
                )
                VALUES (
                    default_tenant_id,
                    default_org_id,
                    existing_user_id,
                    'owner',
                    '["*","super_admin","finance_manager","hr_manager","procurement_manager","holding_auditor"]'::jsonb,
                    true
                )
                ON CONFLICT (organization_id, user_id) 
                DO UPDATE SET 
                    role = 'owner',
                    permissions = '["*","super_admin","finance_manager","hr_manager","procurement_manager","holding_auditor"]'::jsonb,
                    is_active = true;
            END IF;
        END IF;
    END IF;
END $$;
