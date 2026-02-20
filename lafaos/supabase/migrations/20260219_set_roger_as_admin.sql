-- Asigna rol admin al usuario rogerhd4444@gmail.com

UPDATE profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'rogerhd4444@gmail.com' LIMIT 1
);
