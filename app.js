import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';

let allPlayers = []; 

async function loadRating() {
    const { data: players, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

    if (error) {
        document.getElementById('rating-list').innerHTML = `<div style="color:red">Ошибка: ${error.message}</div>`;
        return;
    }

    allPlayers = players || [];
    renderPlayers(allPlayers);

    // --- ДОБАВЛЕНО ДЛЯ АДМИНКИ ---
    // 1. Заполняем список подсказок никами
    const dataList = document.getElementById('players-list');
    if (dataList) {
        dataList.innerHTML = allPlayers.map(p => `<option value="${p.nickname}">`).join('');
    }

    // 2. Ставим сегодняшнюю дату в календарь по умолчанию
    const dateInput = document.getElementById('match-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    // ----------------------------
}

function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    const roleColors = { 
        'Founder': '#b64dff', 
        'Overseer': '#00ff00', 
        'Archivist': '#00ffff', 
        'Bloodline': '#ff4d4d', 
        'Player': '#ffffff' 
    };

    container.innerHTML = list.map((p, i) => {
        const rank = getRankByPercentile(allPlayers.indexOf(p) + 1, allPlayers.length);
        
        let displayRole = p.role || 'Player';
        const hasVip = p.secondary_role === 'Bloodline';
        if (displayRole === 'Player' && hasVip) displayRole = 'Bloodline';

        const currentColor = roleColors[displayRole] || '#ffffff';

        return `
        <div class="match-card">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: 0 0 8px ${currentColor}55;"></div>
            
            <div style="flex-grow: 1;">
                <b class="nick-hover role-${displayRole.toLowerCase()}" style="font-size: 1.1em; color: white;">${p.nickname}</b>
                <div style="display: flex; align-items: center; gap: 5px; margin-top: 4px;">
                    <div class="badge" style="color: ${currentColor}; border-color: ${currentColor}; font-size: 0.6em; padding: 2px 6px;">${displayRole.toUpperCase()}</div>
                    ${hasVip && displayRole !== 'Bloodline' ? `<div class="badge" style="color: #555; border-color: #555; font-size: 0.5em; padding: 1px 4px;">BLOODLINE</div>` : ''}
                </div>
                <!-- ПЛАШКА РАНГА -->
                <div class="badge rank-${rank}">${rank}</div>
            </div>

            <div style="text-align: right;">
                <div class="elo-val">${p.elo}</div>
                <div style="font-size: 0.6em; color: #848e9c;">POINTS</div>
            </div>
        </div>`;
    }).join('');
}

document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
});

loadRating();

import { handleAddMatch } from './admin.js';
window.handleAddMatch = handleAddMatch;
import { loadHistory } from './history.js';

window.showRating = () => {
    document.getElementById('btn-rating').style.background = 'var(--blood)';
    document.getElementById('btn-history').style.background = 'var(--card)';
    document.getElementById('search').style.display = 'block'; // Показываем поиск
    loadRating();
};

window.showHistory = () => {
    document.getElementById('btn-history').style.background = 'var(--blood)';
    document.getElementById('btn-rating').style.background = 'var(--card)';
    document.getElementById('search').style.display = 'none'; // Скрываем поиск рейтинга
    loadHistory();
};
