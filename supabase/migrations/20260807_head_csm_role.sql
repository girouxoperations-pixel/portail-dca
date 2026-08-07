-- Allow head_csm as a valid role value
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'closer', 'setter', 'csm', 'head_csm', 'cm'));
