-- ============================================================
-- Shared Inventory — Supabase Security Fixes
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. PROFILES TABLE POLICIES
-- Users can only see profiles they own OR are a member of.
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- ============================================================
-- 3. FIELDS TABLE POLICIES
-- Only members of the owning profile can access fields.
-- ============================================================

DROP POLICY IF EXISTS "fields_select" ON fields;
CREATE POLICY "fields_select" ON fields
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fields_insert" ON fields;
CREATE POLICY "fields_insert" ON fields
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fields_update" ON fields;
CREATE POLICY "fields_update" ON fields
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fields_delete" ON fields;
CREATE POLICY "fields_delete" ON fields
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. ACTIVITIES TABLE POLICIES (same pattern as fields)
-- ============================================================

DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activities_insert" ON activities;
CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activities_update" ON activities;
CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activities_delete" ON activities;
CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. MATERIALS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "materials_select" ON materials;
CREATE POLICY "materials_select" ON materials
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "materials_insert" ON materials;
CREATE POLICY "materials_insert" ON materials
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "materials_update" ON materials;
CREATE POLICY "materials_update" ON materials
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "materials_delete" ON materials;
CREATE POLICY "materials_delete" ON materials
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. ENTRIES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "entries_select" ON entries;
CREATE POLICY "entries_select" ON entries
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "entries_insert" ON entries;
CREATE POLICY "entries_insert" ON entries
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "entries_update" ON entries;
CREATE POLICY "entries_update" ON entries
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "entries_delete" ON entries;
CREATE POLICY "entries_delete" ON entries
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. ADD CHECK CONSTRAINTS — Block Negative Prices
-- Prevents negative material prices from corrupting cost data.
-- ============================================================

ALTER TABLE materials
  DROP CONSTRAINT IF EXISTS materials_price_non_negative;

ALTER TABLE materials
  ADD CONSTRAINT materials_price_non_negative CHECK (price >= 0);

-- ============================================================
-- 8. INVITE TOKEN TABLE (replaces raw UUID sharing)
-- Generates short-lived invite codes instead of exposing
-- raw profile UUIDs as the joining mechanism.
-- ============================================================

CREATE TABLE IF NOT EXISTS estate_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  created_by  uuid NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at     timestamptz
);

-- RLS for invite table — only profile owners can create/read invites
ALTER TABLE estate_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_select" ON estate_invites;
CREATE POLICY "invites_select" ON estate_invites
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "invites_insert" ON estate_invites;
CREATE POLICY "invites_insert" ON estate_invites
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- 9. FUNCTION: join_estate_by_token (replaces join_estate_by_key)
-- Validates token expiry and single-use before adding member.
-- ============================================================

CREATE OR REPLACE FUNCTION join_estate_by_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite estate_invites%ROWTYPE;
BEGIN
  -- Find valid, unexpired, unused invite
  SELECT * INTO v_invite
  FROM estate_invites
  WHERE token = p_token
    AND expires_at > now()
    AND used_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already used invite token.';
  END IF;

  -- Check not already a member
  IF EXISTS (
    SELECT 1 FROM profile_members
    WHERE profile_id = v_invite.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this estate.';
  END IF;

  -- Add member
  INSERT INTO profile_members (profile_id, user_id)
  VALUES (v_invite.profile_id, auth.uid());

  -- Mark invite as used
  UPDATE estate_invites SET used_at = now() WHERE id = v_invite.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_estate_by_token TO authenticated;

-- ============================================================
-- 10. MATERIAL_PRICE_LOGS RLS (if table exists)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_price_logs') THEN
    EXECUTE 'ALTER TABLE material_price_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "mpl_select" ON material_price_logs';
    EXECUTE $p$
      CREATE POLICY "mpl_select" ON material_price_logs
        FOR SELECT USING (
          profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
            UNION
            SELECT profile_id FROM profile_members WHERE user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
-- NOTE: The old join_estate_by_key RPC is still functional.
-- Update Settings.jsx to call join_estate_by_token() after
-- implementing an invite generation UI in the Settings page.
-- ============================================================
