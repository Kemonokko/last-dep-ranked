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
        // Ранг считаем через logic.js
        const rank = getRankByPercentile(allPlayers.indexOf(p) + 1, allPlayers.length);
        
        // Логика ролей
        const role = p.role || 'Player';
        const secondary = p.secondary_role || 'None';

        // Определяем визуальную роль (рабочая роль главнее VIP)
        let visualRole = role;
        if (role === 'Player' && secondary === 'Bloodline') visualRole = 'Bloodline';

        // ЦВЕТА (Рамка авы + Ховер ника)
        const roleColors = { 
            'Founder': '#b64dff', 
            'Overseer': '#00ff00', 
            'Archivist': '#00ffff', 
            'Bloodline': '#ff4d4d' 
        };
        
        // Берем цвет роли, если роли нет — белый (для Player)
        const currentColor = roleColors[visualRole] || '#ffffff';
        // Свечение рамки только если это НЕ обычный игрок
        const hasGlow = visualRole !== 'Player' ? `0 0 10px ${currentColor}66` : 'none';

        // Винрейт из базы
        const wr = p.winrate !== undefined ? `${p.winrate}% WR` : '0% WR';

        return `
        <div class="match-card">
            <!-- Аватарка: рамка КРАСНАЯ у Bloodline, ФИОЛЕТОВАЯ у Founder и т.д. -->
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
            
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                <!-- Ник с классом роли для цветного свечения при наведении -->
                <b class="nick-hover role-${visualRole.toLowerCase()}">${p.nickname}</b>
                
                <div>
                    <!-- Только плашка ранга -->
                    <div class="badge rank-${rank}">${rank}</div>
                </div>
            </div>

            <div style="text-align: right; min-width: 85px;">
                <!-- Очки Эло -->
                <div class="elo-val">${p.elo}</div>
                <!-- Живой винрейт -->
                <div class="wr-val">${wr}</div>
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
