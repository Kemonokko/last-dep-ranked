import { supabase } from './config.js';

export async function loadHistory() {
    const container = document.getElementById('rating-list');
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';

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
        const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

        return `
        <div class="match-card" style="position: relative; flex-direction: column; gap: 5px; padding: 12px;">
            <!-- КРАСНЫЙ КРЕСТИК ДЛЯ УДАЛЕНИЯ -->
            <div onclick="deleteMatch('${m.id}')" 
                 style="position: absolute; top: 5px; right: 10px; color: #ff4444; cursor: pointer; font-weight: bold; font-size: 1.1em; z-index: 10;">
                 ✕
            </div>

            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <div style="flex: 1; text-align: left;">
                    <b style="color: white; font-size: 1em;">${m.win}</b>
                    <div style="color: #00ff00; font-size: 0.8em; font-weight: 900;">+${m["elo+"]} (+${m.bonus})</div>
                </div>
                <div style="text-align: center; min-width: 80px;">
                    <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.6em; color: #848e9c;">${dateStr}</div>
                </div>
                <div style="flex: 1; text-align: right;">
                    <b style="color: white; font-size: 1em;">${m.loss}</b>
                    <div style="color: var(--blood); font-size: 0.8em; font-weight: 900;">-${m["elo-"]}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
