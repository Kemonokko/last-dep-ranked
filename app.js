import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {};

// 1. ЗАГРУЗКА РЕЙТИНГА
async function loadRating() {
    const container = document.getElementById('rating-list');
    const { data: players, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });

    if (error) {
        container.innerHTML = `<div style="color:red">Ошибка: ${error.message}</div>`;
        return;
    }

    allPlayers = players || [];
    allPlayers.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').trim(); });
    renderPlayers(allPlayers);

    const dataList = document.getElementById('players-list');
    if (dataList) { dataList.innerHTML = allPlayers.map(p => `<option value="${p.nickname}">`).join(''); }
}

// 2. ОТРИСОВКА КАРТОЧЕК
function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    container.innerHTML = list.map((p) => {
        const globalPos = allPlayers.findIndex(player => player.nickname === p.nickname) + 1;
        const rank = getRankByPercentile(globalPos, allPlayers.length);
        const role = (p.role || 'Player').toString().trim();
        const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
        const currentColor = roleColors[role] || '#ffffff';
        const hasGlow = role !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';

        return `
        <div class="match-card" onclick="window.openProfile('${p.nickname}')">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
            <div style="flex-grow: 1;">
                <b class="nick-hover role-${role.toLowerCase()}" style="font-size: 1.15em; color: white;">${p.nickname}</b><br>
                <div class="badge rank-${rank}">${rank}</div>
            </div>
            <div style="text-align: right; min-width: 85px;">
                <div class="elo-val">${p.elo}</div>
                <div class="wr-val">${p.win_rate || 0}% WR</div>
            </div>
        </div>`;
    }).join('');
}

// 3. ОКНО ПРОФИЛЯ И ВХОД
let currentViewedNick = "";
window.openProfile = async (nick) => {
    currentViewedNick = nick;
    document.getElementById('profile-modal').style.display = 'flex';
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role];
    badge.style.borderColor = roleColors[role];

    if (localStorage.getItem('user_nick') === nick) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('user-section').style.display = 'block';
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('user-section').style.display = 'none';
    }
};

window.handleLogin = async () => {
    const email = document.getElementById('auth-email').value.trim();
    const { data: user } = await supabase.from('profiles').select('*').eq('nickname', currentViewedNick).eq('email', email).single();
    if (user) {
        localStorage.setItem('user_nick', user.nickname);
        localStorage.setItem('user_role', user.role);
        location.reload();
    } else {
        alert("Ха! Пытаешься зайти на чужой аккаунт? У тебя iq как у табуретки, почта не та. Брысь отсюда!");
    }
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

// 4. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
window.showRating = () => {
    document.getElementById('btn-rating').classList.add('active');
    document.getElementById('btn-history').classList.remove('active');
    loadRating();
};
window.showHistory = () => {
    document.getElementById('btn-history').classList.add('active');
    document.getElementById('btn-rating').classList.remove('active');
    loadHistory();
};

// 5. ПРОВЕРКА АДМИНА
const userRole = localStorage.getItem('user_role');
if (['Founder', 'Overseer', 'Archivist'].includes(userRole)) {
    const btn = document.getElementById('admin-btn');
    if (btn) btn.style.display = 'block';
}

document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
});

window.handleAddMatch = handleAddMatch;
loadRating();
window.showMyProfile = () => {
    // 1. Прячем всё остальное
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('search').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'none'; // Скрываем админку при переключении
    
    // 2. Показываем профиль
    document.getElementById('my-profile-section').style.display = 'block';
    
    // 3. Переключаем кнопки (визуал)
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-profile').classList.add('active');

    // 4. Проверяем статус входа
    const myNick = localStorage.getItem('user_nick');
    if (myNick) {
        document.getElementById('auth-ui').style.display = 'none';
        document.getElementById('cabinet-ui').style.display = 'block';
        document.getElementById('cabinet-nick').innerText = myNick;
    } else {
        document.getElementById('auth-ui').style.display = 'block';
        document.getElementById('cabinet-ui').style.display = 'none';
    }
};

// Не забудь добавить возврат видимости поиска в showRating
const oldShowRating = window.showRating;
window.showRating = () => {
    document.getElementById('my-profile-section').style.display = 'none';
    document.getElementById('rating-list').style.display = 'block';
    document.getElementById('search').style.display = 'block';
    oldShowRating();
};
