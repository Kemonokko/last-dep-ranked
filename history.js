import { supabase } from './config.js';

export async function loadHistory() {
    const container = document.getElementById('rating-list');
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';

    const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    // Твоя проверка ошибок на месте
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
        <div class="match-card" ondblclick="window.deleteMatch('${m.id}')" style="flex-direction: column; padding: 15px 12px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                
                <!-- ПОБЕДИТЕЛЬ: Крупные цифры и Бонус -->
                <div style="flex: 1; text-align: left;">
                    <b class="nick-hover role-${winRole}">${m.win}</b>
                    <div style="color: #00ff00; font-size: 0.7em; font-weight: 900;">
                        +${m["elo+"]} <span style="color: #00cc00; font-size: 0.85em; font-weight: 700;">(+${m.bonus || 0})</span>
                    </div>
                </div>

                <!-- СЧЁТ И ДАТА: Дата теперь крупная и жирная -->
                <div style="text-align: center; min-width: 90px;">
                    <div style="font-size: 1.3em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.85em; color: #777; font-weight: bold; margin-top: 2px;">${dateStr}</div>
                </div>

                <!-- ПРОИГРАВШИЙ: Крупные цифры -->
                <div style="flex: 1; text-align: right;">
                    <b class="nick-hover role-${lossRole}">${m.loss}</b>
                    <div style="color: var(--blood); font-size: 0.7em; font-weight: 900;">-${m["elo-"]}</div>
                </div>

            </div>
        </div>`;
    }).join('');
}
