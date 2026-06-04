import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://regpcbvbptmynandccnj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZ3BjYnZicHRteW5hbmRjY25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzAxMCwiZXhwIjoyMDk1Mjg5MDEwfQ.CNY98MTA8_UuYwYSIhTmrEodnFW_zXfv6lcii_8jzUg'
)

const rows = [
  // ── Emma ────────────────────────────────────────────────
  { source: 'closer', closer_name: 'Emma', year: 2026, month: 2,  scheduled_calls: 95,  show_calls: 63,  pitch_calls: 51,  closes: 20, cash_collected: 51333.32, revenue: 80000 },
  { source: 'closer', closer_name: 'Emma', year: 2026, month: 3,  scheduled_calls: 154, show_calls: 98,  pitch_calls: 69,  closes: 20, cash_collected: 67666.64, revenue: 80000 },
  { source: 'closer', closer_name: 'Emma', year: 2026, month: 4,  scheduled_calls: 77,  show_calls: 50,  pitch_calls: 39,  closes: 9,  cash_collected: 35033.32, revenue: 36000 },
  { source: 'closer', closer_name: 'Emma', year: 2026, month: 5,  scheduled_calls: 176, show_calls: 120, pitch_calls: 90,  closes: 27, cash_collected: 76333.30, revenue: 108000 },
  { source: 'closer', closer_name: 'Emma', year: 2026, month: 6,  scheduled_calls: 12,  show_calls: 6,   pitch_calls: 4,   closes: 1,  cash_collected: 2000,     revenue: 4000 },

  // ── Sam ─────────────────────────────────────────────────
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 1,  scheduled_calls: 126, show_calls: 79,  pitch_calls: 47,  closes: 15, cash_collected: 38508.47, revenue: 68000 },
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 2,  scheduled_calls: 81,  show_calls: 40,  pitch_calls: 32,  closes: 11, cash_collected: 24549.85, revenue: 40000 },
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 3,  scheduled_calls: 69,  show_calls: 39,  pitch_calls: 27,  closes: 11, cash_collected: 27026.99, revenue: 44000 },
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 4,  scheduled_calls: 112, show_calls: 53,  pitch_calls: 30,  closes: 11, cash_collected: 28519.99, revenue: 44000 },
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 5,  scheduled_calls: 126, show_calls: 63,  pitch_calls: 35,  closes: 16, cash_collected: 41333.32, revenue: 60000 },
  { source: 'closer', closer_name: 'Samuel', year: 2026, month: 6,  scheduled_calls: 5,   show_calls: 4,   pitch_calls: 1,   closes: 0,  cash_collected: 0,        revenue: 0 },

  // ── Shanny ──────────────────────────────────────────────
  { source: 'closer', closer_name: 'Shanny', year: 2026, month: 3,  scheduled_calls: 14,  show_calls: 11,  pitch_calls: 11,  closes: 0,  cash_collected: 0,        revenue: 0 },
  { source: 'closer', closer_name: 'Shanny', year: 2026, month: 4,  scheduled_calls: 148, show_calls: 83,  pitch_calls: 74,  closes: 10, cash_collected: 27333.33, revenue: 40000 },
  { source: 'closer', closer_name: 'Shanny', year: 2026, month: 5,  scheduled_calls: 265, show_calls: 153, pitch_calls: 115, closes: 39, cash_collected: 71130.73, revenue: 156000 },
  { source: 'closer', closer_name: 'Shanny', year: 2026, month: 6,  scheduled_calls: 20,  show_calls: 11,  pitch_calls: 7,   closes: 2,  cash_collected: 6000,     revenue: 8000 },

  // ── Team ────────────────────────────────────────────────
  { source: 'team', closer_name: 'team', year: 2026, month: 1, scheduled_calls: 281, show_calls: 191, pitch_calls: 163, closes: 55, cash_collected: 179683.02, revenue: 220000 },
  { source: 'team', closer_name: 'team', year: 2026, month: 2, scheduled_calls: 337, show_calls: 202, pitch_calls: 156, closes: 56, cash_collected: 222885.10, revenue: 235000 },
  { source: 'team', closer_name: 'team', year: 2026, month: 3, scheduled_calls: 397, show_calls: 256, pitch_calls: 189, closes: 53, cash_collected: 261715.03, revenue: 218204 },
  { source: 'team', closer_name: 'team', year: 2026, month: 4, scheduled_calls: 502, show_calls: 278, pitch_calls: 212, closes: 49, cash_collected: 187203.27, revenue: 192000 },
  { source: 'team', closer_name: 'team', year: 2026, month: 5, scheduled_calls: 597, show_calls: 359, pitch_calls: 257, closes: 89, cash_collected: 275235.50, revenue: 356000 },
]

const { data, error } = await supabase
  .from('monthly_stats')
  .upsert(rows, { onConflict: 'source,closer_name,year,month' })
  .select('id')

if (error) {
  console.error('Import failed:', error.message)
  process.exit(1)
}

console.log(`Imported ${data.length} rows into monthly_stats`)
