import { supabase } from './config.js';

export async function loadHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';

    // 1. ЗАПОЛНЯЕМ КЭШ ВСЕМИ ИГРОКАМИ (Чтобы цвета ролей были у всех, а не только у тебя)
    const { data: allProfiles } = await supabase.from('profiles').select('nickname, role');
    if (allProfiles) {
        allProfiles.forEach(p => {
            window.roleCache[p.nickname] = (p.role || 'Player').trim().toLowerCase();
        });
    }

    const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    if (error || !matches) return;

    container.innerHTML = matches.map(m => {
        const dateStr = new Date(m.date).toLocaleDateString();
        
        // Достаем роли из нашего свежего кэша
        const winRole = window.roleCache[m.win] || 'player';
        const lossRole = window.roleCache[m.loss] || 'player';

        return `
        <div class="history-item" style="padding: 15px 12px; border-color: #222; position: relative; background: var(--card) !important; border: 1.5px solid var(--border) !important; border-radius: 12px !important; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">          
                
                <!-- ПОБЕДИТЕЛЬ -->
                <div style="flex: 1; text-align: left;">
                    <b class="nick-hover role-${winRole}" 
                       onclick="window.openProfile('${m.win}')" 
                       style="cursor:pointer; font-size: 1.15em; display: inline-block;">
                       ${m.win}
                    </b>
                    <div style="color: #00ff00; font-size: 0.9em; font-weight: 800; margin-top: 2px;">
                        +${m["elo+"]}(${m.bonus || 0})
                    </div>
                </div>   

                <!-- СЧЕТ -->
                <div style="text-align: center; min-width: 90px;" ondblclick="window.deleteMatch('${m.id}')">
                    <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.7em; color: #777; font-weight: bold; margin-top: 2px;">${dateStr}</div>
                </div>

                <!-- ПРОИГРАВШИЙ -->
                <div style="flex: 1; text-align: right;">
                    <b class="nick-hover role-${lossRole}" 
                       onclick="window.openProfile('${m.loss}')" 
                       style="cursor:pointer; font-size: 1.15em; display: inline-block;">
                       ${m.loss}
                    </b>
                    <div style="color: var(--blood); font-size: 0.95em; font-weight: 800; margin-top: 2px;">-${m["elo-"]}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
