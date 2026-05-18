const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    let query = supabase.from('match_history').select('*').order('date', { ascending: false });

    if (username && username !== "Загрузка..." && username.trim() !== "") {
      query = query.or(`win.eq."${username}",loss.eq."${username}"`).limit(3);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
