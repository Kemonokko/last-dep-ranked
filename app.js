import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {};

// 1. УНИВЕРСАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК
function switchTab(activeBtnId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = ''; 
    });
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('search').style.display = 'none';
    document.getElementById('my-profile-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'none';

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

// 2. ЗАГРУЗКА И ОТРИСОВКА
async function loadRating() {
    const container = document.getElementById('rating-list');
    const { data: players, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
    if (error) return;

    allPlayers = players || [];
    allPlayers.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); });
    renderPlayers(allPlayers);

    const dataList = document.getElementById('players-list');
    if (dataList) dataList.innerHTML = allPlayers.map(p => `<option value="${p.nickname}">`).join('');
}

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

// 3. ПОИСК
document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const isHistory = document.getElementById('btn-history').classList.contains('active');
    if (isHistory) {
        document.querySelectorAll('#rating-list .match-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(val) ? 'flex' : 'none');
    } else {
        renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
    }
});

window.openProfile = async (nick) => {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    
    // 1. Данные профиля
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    document.getElementById('prof-elo').innerText = p.elo;
    document.getElementById('prof-wr').innerText = (p.win_rate || 0) + '%';
    document.getElementById('prof-bio').innerText = p.bio || "Этот боец предпочитает молчать о себе...";

    // Покраска роли (ИСПРАВЛЕНО)
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role] || '#fff';
    badge.style.borderColor = roleColors[role] || '#fff';

    // 2. ЗАГРУЗКА 3 ПОСЛЕДНИХ БОЕВ
    const { data: matches } = await supabase
        .from('match_history')
        .select('*')
        .or(`win.eq."${nick}",loss.eq."${nick}"`) // Исправлено экранирование кавычек
        .order('date', { ascending: false })
        .limit(3);

    const gamesContainer = document.getElementById('prof-recent-games');
    if (matches && matches.length > 0) {
        gamesContainer.innerHTML = matches.map(m => {
            const isWin = m.win === nick;
            const oppNick = isWin ? m.loss : m.win;
            const resColor = isWin ? '#00ff00' : 'var(--blood)';
            const oppRole = (window.roleCache[oppNick] || 'Player').toLowerCase();
            
            return `
            <div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; font-size:0.85em; border-left: 3px solid ${resColor};">
                <span style="color:${resColor}; font-weight:bold; width:35px;">${isWin ? 'WIN' : 'LOSS'}</span>
                <span style="color:#848e9c; font-size:0.8em;">vs</span>
                <b class="nick-hover role-${oppRole}" onclick="window.openProfile('${oppNick}')" style="cursor:pointer; flex:1; text-align:left; margin-left:10px;">${oppNick}</b>
                <span style="font-weight:bold; color:var(--gold);">${m.win_r}:${m.loss_r}</span>
            </div>`;
        }).join('');
    } else {
        gamesContainer.innerHTML = '<div style="color:#444; font-size:0.8em; text-align:center;">Матчей еще не было</div>';
    }
};

window.handleLogin = async () => {
    const email = document.getElementById('login-email').value.trim();
    const { data: user } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (user) {
        localStorage.setItem('user_nick', user.nickname);
        localStorage.setItem('user_role', user.role);
        location.reload();
    } else { alert("Почта не та. Съебался"); }
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

const myRole = localStorage.getItem('user_role');
if (['Founder', 'Overseer', 'Archivist'].includes(myRole)) {
    const btn = document.getElementById('admin-btn');
    if (btn) btn.style.display = 'block';
}

window.handleAddMatch = handleAddMatch;
loadRating();
