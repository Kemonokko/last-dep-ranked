import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';

let allPlayers = []; // Храним всех игроков тут для быстрого поиска

async function loadRating() {
    console.log("Начинаю загрузку игроков...");
    const { data: players, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

    if (error) {
        document.getElementById('rating-list').innerHTML = `<div style="color:red">Ошибка базы: ${error.message}</div>`;
        return;
    }

    allPlayers = players || [];
    renderPlayers(allPlayers);
    console.log("Игроки успешно загружены!");
}

// Функция отрисовки списка
function renderPlayers(playersList) {
    const container = document.getElementById('rating-list');
    const total = allPlayers.length; // Ранг считаем от общего числа игроков

    if (playersList.length === 0) {
        container.innerHTML = '<div style="color:white; text-align:center; padding: 20px;">Игрок не найден...</div>';
        return;
    }

    container.innerHTML = playersList.map((p) => {
        // Находим позицию игрока в общем списке для правильного ранга
        const globalIndex = allPlayers.findIndex(item => item.id === p.id);
        const rankName = getRankByPercentile(globalIndex + 1, total);
        const roleClass = (p.role || 'player').toLowerCase();
        
        return `
        <div class="match-card">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${p.role === 'Founder' ? '#b64dff' : '#3d0000'}"></div>
            <div style="flex-grow: 1;">
                <div class="role-badge role-${roleClass}">${p.role || 'Player'}</div>
                <br>
                <b style="font-size: 1.1em; color: white;">${p.nickname}</b>
                <br>
                <div class="badge rank-${rankName}">${rankName}</div>
            </div>
            <div style="text-align: right;">
                <div class="elo-val">${Number(p.elo).toLocaleString('ru-RU')}</div>
                <div style="font-size: 0.6em; color: #848e9c;">POINTS</div>
            </div>
        </div>`;
    }).join('');
}

// Оживляем поиск: фильтрация при каждом вводе символа
document.getElementById('search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allPlayers.filter(p => 
        p.nickname.toLowerCase().includes(searchTerm)
    );
    renderPlayers(filtered);
});

loadRating();
