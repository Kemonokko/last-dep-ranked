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
    container.innerHTML = list.map((p, i) => {
        const rank = getRankByPercentile(allPlayers.indexOf(p) + 1, allPlayers.length);
        
        const role = p.role || 'Player';
        const secondary = p.secondary_role || 'None';

        // ПРИОРИТЕТ РОЛИ ДЛЯ ЦВЕТА (Рамка + Ховер)
        let visualRole = role;
        if (role === 'Player' && secondary === 'Bloodline') visualRole = 'Bloodline';

        const roleColors = { 
            'Founder': '#b64dff', 
            'Overseer': '#00ff00', 
            'Archivist': '#00ffff', 
            'Bloodline': '#880000' // ТОТ САМЫЙ ТЕМНО-КРАСНЫЙ
        };

        const currentColor = roleColors[visualRole] || '#ffffff';
        const hasGlow = visualRole !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';

        return `
        <div class="match-card">
            <!-- ТЕПЕРЬ ТУТ ЦВЕТНАЯ РАМКА У ВСЕХ РОЛЕЙ (ВКЛЮЧАЯ BLOODLINE) -->
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
            
            <div style="flex-grow: 1;">
                <b class="nick-hover role-${visualRole.toLowerCase()}">${p.nickname}</b><br>
                <div class="badge rank-${rank}">${rank}</div>
            </div>

            <div style="text-align: right; min-width: 85px;">
                <div class="elo-val">${p.elo}</div>
                <div class="wr-val">${p.winrate || 0}% WR</div>
            </div>
        </div>`;
    }).join('');
}

document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const isHistory = document.getElementById('btn-history').style.background === 'var(--blood)';

    if (isHistory) {
        // Если мы в истории — фильтруем карточки по нику победителя или проигравшего
        const cards = document.querySelectorAll('#rating-list .match-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(val) ? 'flex' : 'none';
        });
    } else {
        // Если мы в рейтинге — обычная фильтрация массива
        renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
    }
});

loadRating();

import { handleAddMatch } from './admin.js';
window.handleAddMatch = handleAddMatch;
import { loadHistory } from './history.js';

window.showRating = () => {
    document.getElementById('btn-rating').style.background = 'var(--blood)';
    document.getElementById('btn-history').style.background = 'var(--card)';
    // Поиск ТЕПЕРЬ ВСЕГДА ВИДЕН
    document.getElementById('search').placeholder = "Поиск игрока в рейтинге...";
    loadRating();
};

window.showHistory = () => {
    document.getElementById('btn-history').style.background = 'var(--blood)';
    document.getElementById('btn-rating').style.background = 'var(--card)';
    // Поиск ТЕПЕРЬ ВСЕГДА ВИДЕН
    document.getElementById('search').placeholder = "Поиск по истории (ник)...";
    loadHistory();
};
