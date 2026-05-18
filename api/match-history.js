import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data: matches, error } = await supabase
    .from('match_history')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(matches)
}
