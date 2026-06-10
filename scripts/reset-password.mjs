// Script temporaire — reset mot de passe via Supabase Admin API
// Usage: node scripts/reset-password.mjs <email> <nouveau-mot-de-passe>

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = 'https://regpcbvbptmynandccnj.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZ3BjYnZicHRteW5hbmRjY25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzAxMCwiZXhwIjoyMDk1Mjg5MDEwfQ.CNY98MTA8_UuYwYSIhTmrEodnFW_zXfv6lcii_8jzUg'

const [,, email, newPassword] = process.argv

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.mjs <email> <nouveau-mot-de-passe>')
  process.exit(1)
}

if (newPassword.length < 8) {
  console.error('Le mot de passe doit faire au moins 8 caractères.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Trouver l'utilisateur par email
const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error('Erreur listUsers:', listErr.message); process.exit(1) }

const user = users.find(u => u.email === email)
if (!user) { console.error(`Utilisateur "${email}" introuvable.`); process.exit(1) }

// Mettre à jour le mot de passe
const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
if (updateErr) { console.error('Erreur update:', updateErr.message); process.exit(1) }

console.log(`✓ Mot de passe mis à jour pour ${email}`)
console.log('Tu peux maintenant te connecter avec le nouveau mot de passe.')
