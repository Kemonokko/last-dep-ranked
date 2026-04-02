import { supabase } from './config.js';

export async function loadHistory() {
    const container = document.getElementById('rating-list');
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';

    const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .order('date', { ascending: false }) // Сначала свежие
        .limit(50); // Берем последние 50 игр

    if (error) {
        container.innerHTML = `<div style="color:red">Ошибка истории: ${error.message}</div>`;
        return;
    }

    if (!matches || matches.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px;">📜 История пуста. Начните первый бой!</div>';
        return;
    }

    container.innerHTML = matches.map(m => {
        // Форматируем дату из YYYY-MM-DD в DD.MM
        const d = new Date(m.date);
        const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

        return `
        <div class="match-card" style="flex-direction: column; gap: 5px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <!-- Победитель -->
                <div style="flex: 1; text-align: left;">
                    <b style="color: white; font-size: 1em;">${m.win}</b>
                    <div style="color: #00ff00; font-size: 0.8em; font-weight: 900;">+${m["elo+"]} (+${m.bonus})</div>
                </div>

                <!-- Счёт и Дата -->
                <div style="text-align: center; min-width: 80px;">
                    <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.6em; color: #848e9c;">${dateStr}</div>
                </div>

                <!-- Проигравший -->
                <div style="flex: 1; text-align: right;">
                    <b style="color: white; font-size: 1em;">${m.loss}</b>
                    <div style="color: var(--blood); font-size: 0.8em; font-weight: 900;">-${m["elo-"]}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
