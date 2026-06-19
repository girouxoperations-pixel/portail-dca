'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  if (!profil) throw new Error('Non autorisé')

  return { userId: user.id, role: ((profil.roles ?? []) as string[])[0] as string }
}

// ── Bucket : s'assurer qu'il existe ─────────────────────────────────
async function ensureBucket(db: ReturnType<typeof createAdminClient>) {
  try {
    await db.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      ],
    })
  } catch {
    // Bucket déjà existant — on ignore
  }
}

// ── Upload ────────────────────────────────────────────────────────────
export async function uploadDocument(formData: FormData) {
  const { userId } = await requireAuth()
  const db = createAdminClient()

  const file        = formData.get('file') as File
  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const section     = formData.get('section') as string

  if (!file || !name || !section) throw new Error('Champs requis manquants')
  if (file.size > 50 * 1024 * 1024) throw new Error('Fichier trop grand (max 50 Mo)')

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? ''
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${section}/${Date.now()}-${safeName}`

  await ensureBucket(db)

  const arrayBuffer = await file.arrayBuffer()
  const { error: storageError } = await db.storage
    .from('documents')
    .upload(filePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (storageError) throw new Error(storageError.message)

  const { data: { publicUrl } } = db.storage.from('documents').getPublicUrl(filePath)

  const { error } = await db.from('documents').insert({
    name,
    description,
    section,
    file_url:    publicUrl,
    file_type:   ext,
    file_size:   file.size,
    uploaded_by: userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/documents')
}

// ── Suppression ───────────────────────────────────────────────────────
export async function supprimerDocument(id: string, fileUrl: string) {
  const { userId, role } = await requireAuth()
  const db = createAdminClient()

  const { data: doc } = await db
    .from('documents').select('uploaded_by').eq('id', id).single()
  if (!doc) throw new Error('Document introuvable')

  if (role !== 'admin' && role !== 'csm' && doc.uploaded_by !== userId) {
    throw new Error('Non autorisé')
  }

  // Suppression du fichier dans Storage
  try {
    const url      = new URL(fileUrl)
    const segments = url.pathname.split('/object/public/documents/')
    if (segments.length === 2) {
      await db.storage.from('documents').remove([decodeURIComponent(segments[1])])
    }
  } catch {
    // Erreur storage non bloquante
  }

  const { error } = await db.from('documents').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/documents')
}
