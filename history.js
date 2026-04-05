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

    const winRole = (window.roleCache[m.win] || 'Player').toLowerCase();
    const lossRole = (window.roleCache[m.loss] || 'Player').toLowerCase();

    return `
    <div class="history-item" style="flex-direction: column; padding: 15px 12px; border-color: #222; position: relative;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            
            <!-- ПОБЕДИТЕЛЬ: Крупный шрифт и принудительный клик -->
            <div style="flex: 1; text-align: left; position: relative; z-index: 10;">
<b class="nick-hover role-${winRole}" 
   onclick="event.stopPropagation(); console.log('КЛИК ПРОШЕЛ!'); window.openProfile('${m.win}')" 
   style="cursor:pointer; font-size: 1.15em; border: 3px solid red !important; position: relative !important; z-index: 999999 !important; display: inline-block !important; pointer-events: auto !important;">
   ${m.win}
</b>
                <div style="color: #00ff00; font-size: 0.9em; font-weight: 800; margin-top: 2px;">
                    +${m["elo+"]}(${m.bonus || 0})
                </div>
            </div>

            <!-- СЧЁТ И ДАТА (Двойной клик для удаления перенесен сюда, чтобы не мешал никам) -->
            <div style="text-align: center; min-width: 90px; cursor: help;" ondblclick="window.deleteMatch('${m.id}')">
                <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                <div style="font-size: 0.7em; color: #777; font-weight: bold; margin-top: 2px;">${dateStr}</div>
            </div>

            <!-- ПРОИГРАВШИЙ -->
            <div style="flex: 1; text-align: right; position: relative; z-index: 10;">
                <b class="nick-hover role-${lossRole}" 
                   onclick="window.openProfile('${m.loss}')" 
                   style="cursor:pointer; font-size: 1.15em; display: inline-block;">${m.loss}</b>
                <div style="color: var(--blood); font-size: 0.93em; font-weight: 800; margin-top: 2px;">-${m["elo-"]}</div>
            </div>

        </div>
    </div>`;
}).join('');
}
