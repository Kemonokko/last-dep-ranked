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
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    document.getElementById('prof-elo').innerText = p.elo;
    document.getElementById('prof-wr').innerText = (p.win_rate || 0) + '%';
    
    // Красим роль
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role] || '#fff';
    badge.style.borderColor = roleColors[role] || '#fff';
};

// 1. УНИВЕРСАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ (Чинит кнопки)
function switchTab(activeBtnId) {
    // Убираем активный класс и ручной фон у всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = ''; 
    });

    // Скрываем все блоки
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('search').style.display = 'none';
    document.getElementById('my-profile-section').style.display = 'none';
    
    // Подсвечиваем нужную кнопку
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');
}

window.showRating = () => {
    switchTab('btn-rating');
    document.getElementById('rating-list').style.display = 'block';
    document.getElementById('search').style.display = 'block';
    loadRating();
};

window.showHistory = () => {
    switchTab('btn-history');
    document.getElementById('rating-list').style.display = 'block';
    document.getElementById('search').style.display = 'block';
    loadHistory();
};

window.showMyProfile = () => {
    switchTab('btn-profile');
    document.getElementById('my-profile-section').style.display = 'block';
    
    // Проверка авторизации
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

// 2. ИСПРАВЛЕННЫЙ ВХОД (Чтобы "Подтвердить" заработало)
window.handleLogin = async () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) return alert("Введите почту!");

    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (user) {
        localStorage.setItem('user_nick', user.nickname);
        localStorage.setItem('user_role', user.role);
        alert(`Авторизация успешна: ${user.nickname}`);
        location.reload(); // Перезагрузка, чтобы обновить права
    } else {
        alert("Ха! Почта не та. Брысь отсюда, пока тапок не прилетел!");
    }
};

window.handleLogout = () => {
    localStorage.clear();
    location.reload();
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ
function switchTab(tabId) {
    // 1. Сбрасываем все кнопки (удаляем активный класс и очищаем стили)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = ''; // Очищаем ручные правки фона
    });

    // 2. Скрываем все блоки контента
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('search').style.display = 'none';
    document.getElementById('my-profile-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'none';

    // 3. Подсвечиваем нужную кнопку
    document.getElementById(tabId).classList.add('active');
}

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

