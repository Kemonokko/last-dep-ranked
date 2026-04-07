import { supabase } from './config.js';
export async function loadHistory() {
    const container = document.getElementById('rating-list'); // Выводим в основной список
    container.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка истории...</div>';

    const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    if (error) return;

    // Проверяем, являешься ли ты Founder (для права на удаление)
    const isFounder = localStorage.getItem('user_role') === 'founder';

    container.innerHTML = matches.map(m => {
        const dateStr = new Date(m.date).toLocaleDateString();
        return `
        <div class="match-card" style="flex-direction: column; align-items: stretch; cursor: default;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <b class="role-${(window.roleCache[m.win] || 'player')}" style="font-size: 1.1em;">${m.win}</b>
                <div style="text-align: center; min-width: 60px; ${isFounder ? 'cursor: pointer;' : ''}" 
                     ${isFounder ? `ondblclick="window.deleteMatch('${m.id}')" title="Двойной клик для удаления"` : ''}>
                    <div style="font-size: 1.2em; font-weight: 900; color: var(--gold);">${m.win_r}:${m.loss_r}</div>
                    <div style="font-size: 0.6em; color: #777;">${dateStr}</div>
                </div>
                <b class="role-${(window.roleCache[m.loss] || 'player')}" style="font-size: 1.1em;">${m.loss}</b>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8em; margin-top: 5px;">
                <span style="color: #00ff00;">+${m["elo+"]}</span>
                <span style="color: var(--blood);">-${m["elo-"]}</span>
            </div>
        </div>`;
    }).join('');
}

// ФУНКЦИЯ УДАЛЕНИЯ (ТОЛЬКО ДЛЯ ТЕБЯ)
window.deleteMatch = async (id) => {
    if (localStorage.getItem('user_role') !== 'founder') return;
    if (!confirm("Удалить этот матч и откатить ELO?")) return;

    const { error } = await supabase.from('match_history').delete().eq('id', id);
    if (error) alert("Ошибка удаления: " + error.message);
    else location.reload();
};
