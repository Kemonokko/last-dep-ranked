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
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2); 
        const dateStr = `${day}.${month}.${year}`;

        return `
        <!-- УДАЛЕНИЕ ТЕПЕРЬ ПО ДВОЙНОМУ КЛИКУ НА КАРТОЧКУ (ondblclick) -->
        <div class="match-card" ondblclick="window.deleteMatch('${m.id}')" 
             style="position: relative; flex-direction: column; gap: 5px; padding: 15px 12px; border-color: #222; cursor: pointer; user-select: none;" 
             title="Двойной клик для удаления">
            
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <!-- Победитель (Ник крупнее) -->
                <div style="flex: 1; text-align: left; overflow: hidden;">
                    <b style="color: white; font-size: 1.1em; white-space: nowrap; text-shadow: 0 0 5px rgba(255,255,255,0.2);">${m.win}</b>
                    <div style="color: #00ff00; font-size: 0.85em; font-weight: 900;">+${m["elo+"]} (+${m.bonus})</div>
                </div>

                <!-- Счёт и Дата -->
                <div style="text-align: center; min-width: 95px;">
                    <div style="font-size: 1.3em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.75em; color: #848e9c; font-weight: bold;">${dateStr}</div>
                </div>

                <!-- Проигравший (Ник крупнее) -->
                <div style="flex: 1; text-align: right; overflow: hidden;">
                    <b style="color: white; font-size: 1.1em; white-space: nowrap; text-shadow: 0 0 5px rgba(255,255,255,0.2);">${m.loss}</b>
                    <div style="color: var(--blood); font-size: 0.85em; font-weight: 900;">-${m["elo-"]}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
