import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username } = req.query

  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }

  const { data, error } = await supabase
    .from('match_history')
    .select('*')
    .or(`win.eq."${username}",loss.eq."${username}"`)
    .order('date', { ascending: false })
    .limit(3)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
