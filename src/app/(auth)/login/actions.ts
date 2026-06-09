'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  const email    = (formData.get('email')    as string).trim()
  const password = formData.get('password')  as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message === 'Invalid login credentials' || error.message.includes('invalid_credentials')) {
      redirect('/login?error=credentials')
    }
    if (error.message.includes('Email not confirmed')) {
      redirect('/login?error=unconfirmed')
    }
    redirect('/login?error=unknown')
  }

  redirect('/dashboard')
}
