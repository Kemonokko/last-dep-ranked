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
    if (!container) return;

    container.innerHTML = list.map((p) => {
        // 1. Находим реальную позицию игрока в общем топе (для ранга)
        const globalPos = allPlayers.findIndex(player => player.nickname === p.nickname) + 1;
        const rank = getRankByPercentile(globalPos, allPlayers.length);
        
        // 2. Берем роль из базы и приводим к нужному формату (на случай опечаток)
        const rawRole = (p.role || 'Player').toString().trim();
        // Делаем первую букву большой, остальные маленькие (Bloodline, Founder и т.д.)
        const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
        
        // 3. Таблица цветов
        const roleColors = { 
            'Founder': '#b64dff',   // Фиолетовый
            'Overseer': '#00ff00',  // Салатовый
            'Archivist': '#00ffff', // Циановый
            'Bloodline': '#880000', // ТВОЙ ТЕМНО-КРАСНЫЙ
            'Player': '#ffffff'     // Белый
        };

        // Берем цвет. Если роли нет в списке — будет белый.
        const currentColor = roleColors[role] || '#ffffff';
        
        // Свечение рамки только для ролей (не для Player)
        const hasGlow = role !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';
console.log("Игрок:", p.nickname, "Его роль:", role, "Цвет:", currentColor);
        return `
        <div class="match-card">
            <!-- ТЕПЕРЬ ТУТ currentColor ПРИВЯЗАН К role. ВСЁ СОВПАДАЕТ -->
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
            
            <div style="flex-grow: 1;">
                <!-- НИК: Светится цветом роли при наведении -->
                <b class="nick-hover role-${role.toLowerCase()}" style="font-size: 1.15em; color: white;">
                    ${p.nickname}
                </b><br>
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
    document.getElementById('search').placeholder = "Поиск по истории...";
    loadHistory();
};
