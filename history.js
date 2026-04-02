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
    const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;

    // Получаем роли из кеша (который мы создали в app.js)
    const winRole = (window.roleCache[m.win] || 'Player').toLowerCase();
    const lossRole = (window.roleCache[m.loss] || 'Player').toLowerCase();

    return `
    <div class="match-card" ondblclick="window.deleteMatch('${m.id}')" style="position: relative; flex-direction: column; gap: 5px; padding: 18px 12px 12px 12px; border-color: #222; cursor: pointer;">
        <div onclick="window.deleteMatch('${m.id}')" style="position: absolute; top: 2px; right: 6px; color: #ff4444; cursor: pointer; font-weight: bold; font-size: 1.2em; z-index: 100; padding: 5px;">✕</div>

        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="flex: 1; text-align: left; overflow: hidden;">
                <!-- Добавили классы ролей для истории -->
                <b class="nick-hover role-${winRole}" style="font-size: 0.95em; white-space: nowrap; color: white;">${m.win}</b>
                <div style="color: #00ff00; font-size: 0.85em; font-weight: 900;">+${m["elo+"]} (+${m.bonus})</div>
            </div>

            <div style="text-align: center; min-width: 90px;">
                <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                <div style="font-size: 0.75em; color: #848e9c; font-weight: bold;">${dateStr}</div>
            </div>

            <div style="flex: 1; text-align: right; overflow: hidden;">
                <!-- Добавили классы ролей для истории -->
                <b class="nick-hover role-${lossRole}" style="font-size: 0.95em; white-space: nowrap; color: white;">${m.loss}</b>
                <div style="color: var(--blood); font-size: 0.85em; font-weight: 900;">-${m["elo-"]}</div>
            </div>
        </div>
    </div>`;
}).join('');
}
