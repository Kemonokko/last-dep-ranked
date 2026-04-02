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
        
        // Роль и вторичная роль для логики
        const role = p.role || 'Player';
        const secondary = p.secondary_role || 'None';
        
        // Определяем "Визуальную роль" (приоритет рабочей роли над VIP)
        let visualRole = role;
        if (role === 'Player' && secondary === 'Bloodline') visualRole = 'Bloodline';

        // Рамка авы только для Founder
        const avatarBorder = role === 'Founder' ? 'var(--founder)' : '#fff';
        const avatarGlow = role === 'Founder' ? '0 0 10px var(--founder)' : 'none';

        // Цвета для плашек ролей
        const roleColors = { 'Founder': 'var(--founder)', 'Bloodline': 'var(--bloodline)', 'Overseer': 'var(--overseer)', 'Archivist': 'var(--archivist)' };
        const currentColor = roleColors[visualRole];

        return `
        <div class="match-card">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${avatarBorder}; box-shadow: ${avatarGlow};"></div>
            
            <div style="flex-grow: 1;">
                <!-- Ник с классом роли для цветного свечения -->
                <b class="nick-hover role-${visualRole.toLowerCase()}" style="font-size: 1.2em;">
                    ${p.nickname}
                </b><br>
                
                <div style="display: flex; align-items: center; gap: 5px;">
                    <!-- Плашка роли показывается только если это НЕ обычный игрок -->
                    ${currentColor ? `
                        <div class="badge" style="color: ${currentColor}; border-color: ${currentColor}; font-size: 0.6em; padding: 2px 6px;">
                            ${visualRole.toUpperCase()}
                        </div>
                    ` : ''}

                    <!-- Серая пометка BLOODLINE, если есть VIP и это не основная роль -->
                    ${secondary === 'Bloodline' && visualRole !== 'Bloodline' ? 
                        `<div class="badge" style="color: #555; border-color: #555; font-size: 0.5em; padding: 2px 4px;">BLOODLINE</div>` : ''}
                </div>

                <!-- Ранг (крупный и яркий) -->
                <div class="badge rank-${rank}">${rank}</div>
            </div>

            <div style="text-align: right;">
                <div class="elo-val">${p.elo}</div>
                <div style="font-size: 0.6em; color: #848e9c; font-weight: bold;">POINTS</div>
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
