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

        // Берем роли из кеша для подсветки ников
        const winRole = (window.roleCache[m.win] || 'Player').toLowerCase();
        const lossRole = (window.roleCache[m.loss] || 'Player').toLowerCase();

        return `
        <!-- УДАЛЕНИЕ ТОЛЬКО ПО ДВОЙНОМУ КЛИКУ (ondblclick) -->
        <div class="match-card" ondblclick="window.deleteMatch('${m.id}')" 
             style="flex-direction: column; gap: 5px; padding: 18px 12px; border-color: #222; cursor: pointer; user-select: none;">
            
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <!-- Победитель (Крупный ник) -->
                <div style="flex: 1; text-align: left; overflow: hidden;">
                    <b class="nick-hover role-${winRole}" style="font-size: 1.15em; white-space: nowrap; color: white;">${m.win}</b>
                    <div style="color: #00ff00; font-size: 0.85em; font-weight: 900;">+${m["elo+"]} (+${m.bonus})</div>
                </div>

                <!-- Счёт (Жирный и крупный) и Дата -->
                <div style="text-align: center; min-width: 95px;">
                    <div style="font-size: 1.4em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.75em; color: #848e9c; font-weight: bold; margin-top: 2px;">${dateStr}</div>
                </div>

                <!-- Проигравший (Крупный ник) -->
                <div style="flex: 1; text-align: right; overflow: hidden;">
                    <b class="nick-hover role-${lossRole}" style="font-size: 1.15em; white-space: nowrap; color: white;">${m.loss}</b>
                    <div style="color: var(--blood); font-size: 0.85em; font-weight: 900;">-${m["elo-"]}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
