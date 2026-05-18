import { createClient } from '@supabase/supabase-js'

const WINDOW_SECONDS = 60
const MAX_REQUESTS   = 5

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

/**
 * Returns true if the IP is rate-limited (exceeded MAX_REQUESTS in WINDOW_SECONDS).
 * Uses a sliding window stored in Supabase auth_rate_limits.
 */
export async function isRateLimited(ip: string): Promise<boolean> {
  const supabase = adminClient()
  const now  = new Date()
  const windowStart = new Date(now.getTime() - WINDOW_SECONDS * 1000).toISOString()

  const { data } = await supabase
    .from('auth_rate_limits')
    .select('count, window_start')
    .eq('ip', ip)
    .single()

  if (!data) {
    // First request — insert
    await supabase.from('auth_rate_limits').insert({ ip, count: 1, window_start: now.toISOString() })
    return false
  }

  if (data.window_start < windowStart) {
    // Window expired — reset
    await supabase.from('auth_rate_limits').update({ count: 1, window_start: now.toISOString() }).eq('ip', ip)
    return false
  }

  if (data.count >= MAX_REQUESTS) return true

  // Increment
  await supabase.from('auth_rate_limits').update({ count: data.count + 1 }).eq('ip', ip)
  return false
}
