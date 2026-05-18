import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('elo', { ascending: false })

    if (error) {
      return res.status(500).json({ 
        error: error.message, 
        hint: error.hint, 
        details: error.details,
        message: "Ошибка внутри Supabase" 
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message, message: "Критическая ошибка сервера" })
  }
}
