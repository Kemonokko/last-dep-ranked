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
    if (error) return;

    allPlayers = players || [];
    allPlayers.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); });
    renderPlayers(allPlayers);
}

// 2. ОТРИСОВКА КАРТОЧЕК (Клик работает)
function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    if (!container) return;
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

// 3. ОТКРЫТИЕ КАРТОЧКИ (ПРОФИЛЯ)
window.openProfile = async (nick) => {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    document.getElementById('prof-elo').innerText = p.elo;
    document.getElementById('prof-wr').innerText = (p.win_rate || 0) + '%';
    document.getElementById('prof-bio').innerText = p.bio || "Этот боец предпочитает молчать о себе...";
    
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role];
    badge.style.borderColor = roleColors[role];

    // ЗАГРУЗКА 3 ПОСЛЕДНИХ БОЕВ В КАРТОЧКУ
    const { data: matches } = await supabase.from('match_history').select('*').or(`win.eq."${nick}",loss.eq."${nick}"`).order('date', { ascending: false }).limit(3);
    const gamesContainer = document.getElementById('prof-recent-games');
    if (gamesContainer) {
        gamesContainer.innerHTML = matches && matches.length > 0 ? matches.map(m => {
            const isWin = m.win === nick;
            const oppNick = isWin ? m.loss : m.win;
            const resColor = isWin ? '#00ff00' : '#ff0000';
            const oppRole = (window.roleCache[oppNick] || 'Player').toLowerCase();
            return `
            <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; border-left: 3px solid ${resColor};">
                <span style="color:${resColor}; font-weight:bold; font-size:0.7em; width:35px;">${isWin ? 'WIN' : 'LOSS'}</span>
                <b class="nick-hover role-${oppRole}" onclick="window.openProfile('${oppNick}')" style="cursor:pointer; flex:1; text-align:left; margin-left:10px; font-size:0.9em; color:white;">${oppNick}</b>
                <span style="font-weight:bold; color:var(--gold); font-size:0.9em;">${m.win_r}:${m.loss_r}</span>
            </div>`;
        }).join('') : '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
    }
};

// 4. ОСТАЛЬНАЯ ЛОГИКА
window.handleLogin = async () => {
    const nick = document.getElementById('login-nick').value.trim();
    
    if (!nick) return alert("Введи свой ник!");

    // Теперь ищем в базе по нику, а не по почте
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('nickname', nick)
        .single();
    
    if (user) { 
        localStorage.setItem('user_nick', user.nickname); 
        localStorage.setItem('user_role', user.role || 'Player'); 
        location.reload(); 
    } else { 
        alert("Игрок не найден."); 
    }
};

// Исправленное переключение на РЕЙТИНГ
window.showRating = () => { 
    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none'; // Скрываем профиль
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-rating').classList.add('active');
    loadRating(); 
};

// Исправленное переключение на ИСТОРИЮ
window.showHistory = () => { 
    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none'; // Скрываем профиль
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-history').classList.add('active');
    loadHistory(); 
};

// Твоя функция профиля (добавил только очистку кнопок)
window.showMyProfile = () => {
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('my-profile-section').style.display = 'block';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-profile').classList.add('active');

    const userNick = localStorage.getItem('user_nick');
    if (userNick) {
        document.getElementById('auth-ui').style.display = 'none';
        document.getElementById('cabinet-ui').style.display = 'block';
        document.getElementById('cabinet-nick').innerText = userNick;
        document.getElementById('cabinet-role').innerText = localStorage.getItem('user_role') || 'PLAYER';
    }
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
window.handleAddMatch = handleAddMatch;
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

loadRating();
