import { createClient } from 'https://jsdelivr.net'

// Твой личный адрес базы (НЕ МЕНЯЙ ЕГО!)
const supabaseUrl = 'https://lscxyfxnbuwxbocwsvfo.supabase.co'

// Твой ANON ключ (тот самый длинный из прошлых сообщений)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzY3h5ZnhuYnV3eGJvY3dzdmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODQ3NjMsImV4cCI6MjA5MDU2MDc2M30.5TOcncAoviTRRCvIhmu0607AIZFOzkMxPVvAeH26YDQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
