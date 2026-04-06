import { supabase } from './config.js';

export async function loadHistory() {
    // МЕНЯЕМ ID: теперь история ищет свой собственный блок 'history-list'
    const container = document.getElementById('history-list'); 
    
    if (!container) return; // Защита, если блока нет в HTML
    console.log("Проверка функции openProfile:", typeof window.openProfile);
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';
       
    const { data: profiles } = await supabase.from('profiles').select('nickname, role');
    
    // 2. Наполняем глобальный кэш
    if (profiles) {
        profiles.forEach(p => {
            // Приводим к нижнему регистру для CSS (Founder -> role-founder)
            window.roleCache[p.nickname] = (p.role || 'Player').toLowerCase().trim();
        });
    }

    const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    if (error) {
        container.innerHTML = `<div style="color:red">Ошибка истории: ${error.message}</div>`;
        return;
    }
container.innerHTML = matches.map(m => {
    const d = new Date(m.date);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
console.log(`Игрок: ${m.win}, Роль в кэше: ${window.roleCache[m.win]}`);
    const winRole = (window.roleCache[m.win] || 'Player').toLowerCase();
    const lossRole = (window.roleCache[m.loss] || 'Player').toLowerCase();

    return `
        <div class="history-item" style="padding: 15px 12px; border-color: #222; position: relative; background: var(--card) !important; border: 1.5px solid var(--border) !important; border-radius: 12px !important; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">          
                
                <!-- 1. ПОБЕДИТЕЛЬ (ВСТАВЛЯЙ СЮДА) -->
                <div style="flex: 1; text-align: left;">
                    <b class="nick-hover role-${winRole}" 
                       onclick="window.openProfile('${m.win}')" 
                       style="cursor:pointer; position:relative; z-index:9999 !important; display:inline-block;">
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

                <!-- 2. ПРОИГРАВШИЙ (ВСТАВЛЯЙ СЮДА) -->
                <div style="flex: 1; text-align: right;">
                    <b class="nick-hover role-${lossRole}" 
                       onclick="window.openProfile('${m.loss}')" 
                       style="cursor:pointer; position:relative; z-index:9999 !important; display:inline-block;">
                       ${m.loss}
                    </b>
                    <div style="color: var(--blood); font-size: 0.95em; font-weight: 800; margin-top: 2px;">-${m["elo-"]}</div>
                </div>

            </div>
        </div>`;
    }).join('');
}
