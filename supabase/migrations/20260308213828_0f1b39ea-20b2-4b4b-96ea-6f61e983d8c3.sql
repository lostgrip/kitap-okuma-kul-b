
-- Fix profile group_code for the admin user
UPDATE public.profiles 
SET group_code = 'ZENHUB', is_admin = true 
WHERE user_id = '43c1854f-99d3-4255-ab29-cb230002b318';
