// Vérifie et corrige l'état du compte utilisateur
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = 'https://regpcbvbptmynandccnj.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZ3BjYnZicHRteW5hbmRjY25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzAxMCwiZXhwIjoyMDk1Mjg5MDEwfQ.CNY98MTA8_UuYwYSIhTmrEodnFW_zXfv6lcii_8jzUg'

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TARGET_EMAIL = 'girouxoperations@gmail.com'

// 1. Trouver l'utilisateur
const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error('Erreur:', listErr.message); process.exit(1) }

const user = users.find(u => u.email === TARGET_EMAIL)
if (!user) { console.error(`Utilisateur "${TARGET_EMAIL}" introuvable.`); process.exit(1) }

console.log('--- État actuel ---')
console.log('ID:               ', user.id)
console.log('Email:            ', user.email)
console.log('Email confirmé:   ', user.email_confirmed_at ? 'OUI ✓' : 'NON ✗')
console.log('Dernière connexion:', user.last_sign_in_at ?? 'jamais')

// 2. Confirmer l'email si pas encore fait
if (!user.email_confirmed_at) {
  console.log('\nConfirmation de l\'email...')
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })
  if (error) console.error('Erreur confirmation:', error.message)
  else console.log('✓ Email confirmé')
}

// 3. Vérifier le profil dans la table profiles
const { data: profile, error: profileErr } = await admin
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

if (profileErr || !profile) {
  console.log('\n⚠ Profil manquant dans la table profiles')
} else {
  console.log('\n--- Profil ---')
  console.log('Nom:  ', profile.nom ?? profile.prenom ?? '(vide)')
  console.log('Rôle: ', profile.role ?? '(non défini)')
}

console.log('\n✓ Vérification terminée. Essaie de te connecter maintenant.')
