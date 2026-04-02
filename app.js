import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {}; // Шпаргалка ролей для истории

// 1. ЗАГРУЗКА РЕЙТИНГА
async function loadRating() {
    const container = document.getElementById('rating-list');
    const { data: players, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

    if (error) {
        container.innerHTML = `<div style="color:red">Ошибка: ${error.message}</div>`;
        return;
    }

    allPlayers = players || [];
    
    // Создаем карту ролей (чистим пробелы!)
    allPlayers.forEach(p => {
        window.roleCache[p.nickname] = (p.role || 'Player').toString().trim();
    });

    renderPlayers(allPlayers);

    // Подсказки для админки
    const dataList = document.getElementById('players-list');
    if (dataList) {
        dataList.innerHTML = allPlayers.map(p => `<option value="${p.nickname}">`).join('');
    }
}

// 2. ОТРИСОВКА КАРТОЧЕК
function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    if (!container) return;

    container.innerHTML = list.map((p) => {
        const globalPos = allPlayers.findIndex(player => player.nickname === p.nickname) + 1;
        const rank = getRankByPercentile(globalPos, allPlayers.length);
        
        const role = (p.role || 'Player').toString().trim();
        const roleColors = { 
            'Founder': '#b64dff', 'Overseer': '#00ff00', 
            'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' 
        };

        const currentColor = roleColors[role] || '#ffffff';
        const hasGlow = role !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';

       return `
<div class="match-card" onclick="window.openProfile('${p.nickname}')">
...`
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

// 3. ПОИСК (Универсальный)
document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const isHistory = document.getElementById('btn-history').classList.contains('active');

    if (isHistory) {
        const cards = document.querySelectorAll('#rating-list .match-card');
        cards.forEach(c => c.style.display = c.innerText.toLowerCase().includes(val) ? 'flex' : 'none');
    } else {
        renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
    }
});

// 4. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
window.showRating = () => {
    document.getElementById('btn-rating').className = 'nav-btn active';
    document.getElementById('btn-history').className = 'nav-btn';
    loadRating();
};

window.showHistory = () => {
    document.getElementById('btn-history').className = 'nav-btn active';
    document.getElementById('btn-rating').className = 'nav-btn';
    loadHistory();
};

// 5. ВХОД ДЛЯ FOUNDER
document.querySelector('h1').onclick = async () => {
    const email = prompt("Введите Email администратора:");
    if (!email) return;
    const { data: user } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (user) {
        localStorage.setItem('user_role', user.role);
        alert(`Добро пожаловать, ${user.nickname}!`);
        location.reload();
    } else { alert("Доступ запрещен."); }
};

const myRole = localStorage.getItem('user_role');
if (['Founder', 'Overseer', 'Archivist'].includes(myRole)) {
    const btn = document.getElementById('admin-btn');
    if (btn) btn.style.display = 'block';
}

window.handleAddMatch = handleAddMatch;
loadRating();
let currentViewedNick = ""; // Кого сейчас смотрим

// 1. Открытие окна
window.openProfile = async (nick) => {
    currentViewedNick = nick;
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    
    // Подгружаем данные чела из базы
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    
    // Красим плашку роли в окне
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role] || '#fff';
    badge.style.borderColor = roleColors[role] || '#fff';

    // Проверяем: это ТЫ?
    if (localStorage.getItem('user_nick') === nick) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('user-section').style.display = 'block';
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('user-section').style.display = 'none';
    }
};

// 2. Вход (Проверка почты)
window.handleLogin = async () => {
    const inputEmail = document.getElementById('auth-email').value.trim();
    if (!inputEmail) return alert("Пустоту вводишь? Гений.");

    const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('nickname', currentViewedNick)
        .eq('email', inputEmail)
        .single();

    if (user) {
        localStorage.setItem('user_nick', user.nickname);
        localStorage.setItem('user_role', user.role);
        alert(`Добро пожаловать, ${user.nickname}. Теперь ты официально в системе.`);
        location.reload();
    } else {
        // Твое издевательское сообщение
        alert("Ха! Пытаешься зайти на чужой аккаунт? У тебя iq как у табуретки, почта не та. Брысь отсюда!");
    }
};

// 3. Выход
window.handleLogout = () => {
    localStorage.clear();
    location.reload();
};

// Закрытие на крестик
document.getElementById('close-profile').onclick = () => {
    document.getElementById('profile-modal').style.display = 'none';
};
