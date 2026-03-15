-- Add workgroup_id column to entries table
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS workgroup_id uuid REFERENCES workgroups(id);

-- Optional: If you want to require a workgroup for all entries
-- ALTER TABLE entries ALTER COLUMN workgroup_id SET NOT NULL;

-- Enable RLS for the new column (usually inherited from table RLS)
-- No additional specific policies needed if entries_insert/select already cover profile_id.
