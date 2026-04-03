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
        <div class="match-card" ondblclick="window.deleteMatch('${m.id}')" 
             style="flex-direction: column; gap: 5px; padding: 18px 12px; border-color: #222; cursor: pointer; user-select: none;">
            
<div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
    <!-- НИК ПОБЕДИТЕЛЯ -->
    <div style="flex: 1; text-align: left; overflow: hidden;">
<b class="nick-hover role-${winRole}" onclick="window.openProfile('${m.win}')" style="cursor:pointer; color:white;">${m.win}</b>
        <div style="color: #00ff00; font-size: 0.95em; font-weight: 900; margin-top: 2px;">+${m["elo+"]}</div>
    </div>

    <!-- СЧЁТ -->
    <div style="text-align: center; min-width: 95px;">
        <div style="font-size: 1.4em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
    </div>

    <!-- НИК ПРОИГРАВШЕГО -->
    <div style="flex: 1; text-align: right; overflow: hidden;">
       <b class="nick-hover role-${lossRole}" onclick="window.openProfile('${m.loss}')" style="cursor:pointer; color:white;">${m.loss}</b>
        <div style="color: var(--blood); font-size: 0.95em; font-weight: 900; margin-top: 2px;">-${m["elo-"]}</div>
    </div>
</div>
        </div>`;
    }).join('');
}
