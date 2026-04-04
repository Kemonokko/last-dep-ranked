import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {};

async function loadRating() {
    const container = document.getElementById('rating-list');
    const { data: players, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
    if (error) return;

    allPlayers = players || [];
    allPlayers.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); });
    renderPlayers(allPlayers);
}

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

window.openProfile = async (nick) => {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    
    const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (!p) return;

    document.getElementById('prof-nick').innerText = p.nickname;
    document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
    document.getElementById('prof-elo').innerText = p.elo;
    document.getElementById('prof-wr').innerText = (p.win_rate || 0) + '%';
    document.getElementById('prof-bio').innerText = p.bio || "Пусто...";
    
    const role = (p.role || 'Player').trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const badge = document.getElementById('prof-role-badge');
    badge.innerText = role.toUpperCase();
    badge.style.color = roleColors[role];
    badge.style.borderColor = roleColors[role];

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
window.handleLogin = async () => {
    const nick = document.getElementById('login-nick')?.value.trim();
    if (!nick) return alert("Введи ник!");
    const { data: user } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
    if (user) { 
        localStorage.setItem('user_nick', user.nickname); 
        localStorage.setItem('user_role', user.role || 'Player'); 
        location.reload(); 
    } else { 
        alert("Игрок не найден."); 
    }
};

window.showRating = () => { 
    const searchInput = document.getElementById('search');
    if (searchInput) { searchInput.value = ""; searchInput.style.display = 'block'; }
    
    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-rating').classList.add('active');
    loadRating(); 
};

window.showHistory = () => { 
    const searchInput = document.getElementById('search');
    if (searchInput) { searchInput.value = ""; searchInput.style.display = 'block'; }

    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-history').classList.add('active');
    loadHistory(); 
};

window.showMyProfile = () => {
    const searchInput = document.getElementById('search');
    const userNick = localStorage.getItem('user_nick');
    
    document.getElementById('my-profile-section').style.display = 'block';
    document.getElementById('rating-list').style.display = 'block';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-profile').classList.add('active');

    if (userNick) {
        if (searchInput) searchInput.style.display = 'none';
        document.getElementById('rating-list').style.display = 'none';
        document.getElementById('auth-ui').style.display = 'none';
        document.getElementById('cabinet-ui').style.display = 'block';
        document.getElementById('cabinet-nick').innerText = userNick;
        
        const role = localStorage.getItem('user_role') || 'Player';
        const roleNames = { 'Founder': 'FOUNDER', 'Overseer': 'OVERSEER', 'Archivist': 'ARCHIVIST', 'Bloodline': 'BLOODLINE', 'Player': 'PLAYER' };
        const roleBadge = document.getElementById('cabinet-role');
        if (roleBadge) roleBadge.innerText = roleNames[role] || 'PLAYER';
    } else {
        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.value = "";
            searchInput.placeholder = "🔍 Поиск...";
            searchInput.oninput = () => window.filterPlayersForLogin();
        }
        
        document.getElementById('auth-ui').style.display = 'none';
        document.getElementById('cabinet-ui').style.display = 'none';
        
        document.getElementById('rating-list').innerHTML = `
            <div style="background:var(--card); border:2px solid var(--border); border-radius:20px; padding:30px; text-align:center; margin-top:20px;">
                <h2 style="color:var(--gold);">🔐 Вход</h2>
                <p>Для входа ввести ник в строку поиска</p>
            </div>
        `;
        
        loadAllPlayersForSearch();
    }
};

window.filterPlayers = () => {
    const val = document.getElementById('search').value.toLowerCase().trim();
    const isProfileTab = document.getElementById('my-profile-section').style.display === 'block';
    const isHistoryTab = document.getElementById('btn-history').classList.contains('active');
    const tip = document.getElementById('login-tip');
    
    if (tip) {
        tip.style.display = (val.length > 0 || !isProfileTab) ? 'none' : 'block';
    }

    const players = document.querySelectorAll('.match-card');
    players.forEach(p => {
        const matches = p.innerText.toLowerCase().includes(val);
        if (isHistoryTab) {
            p.style.display = 'none';
        } else if (isProfileTab) {
            p.style.display = (val.length > 0 && matches) ? 'flex' : 'none';
        } else {
            p.style.display = matches ? 'flex' : 'none';
        }
    });

    // 3. ФИЛЬТРУЕМ МАТЧИ (history-item)
    const matchesList = document.querySelectorAll('.history-item');
    matchesList.forEach(m => {
        const fits = m.innerText.toLowerCase().includes(val);
        if (isHistoryTab) {
            m.style.display = fits ? 'flex' : 'none';
        } else {
            m.style.display = 'none';
        }
    });
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
window.handleAddMatch = handleAddMatch;
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };
async function loadAllPlayersForSearch() {
    const { data: players } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
    if (players) {
        window.allPlayers = players;
        window.roleCache = {};
        players.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); });
    }
}

window.filterPlayersForLogin = () => {
    const val = document.getElementById('search').value.toLowerCase().trim();
    const container = document.getElementById('rating-list');
    
    if (!val) {
        container.innerHTML = `
            <div style="background:var(--card); border:2px solid var(--border); border-radius:20px; padding:30px; text-align:center;">
                <h2 style="color:var(--gold);">🔐 Вход</h2>
                <p>Поиск</p>
            </div>
        `;
        return;
    }
    
    const matches = window.allPlayers.filter(p => 
        p.nickname.toLowerCase().startsWith(val) || 
        p.nickname.toLowerCase().includes(val)
    );
    
    if (matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">❌ Игрок не найден</div>`;
        return;
    }
    
    container.innerHTML = matches.map(p => {
        const rank = getRankByPercentile(
            window.allPlayers.findIndex(player => player.nickname === p.nickname) + 1, 
            window.allPlayers.length
        );
        return `
        <div class="match-card" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}');"></div>
                <div>
                    <b style="font-size: 1.15em; color: white;">${p.nickname}</b><br>
                    <div class="badge rank-${rank}">${rank}</div>
                </div>
            </div>
            <button onclick="window.loginWithEmail('${p.nickname}')" 
                    style="background: var(--blood); border: none; color: white; padding: 8px 20px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                ВОЙТИ
            </button>
        </div>`;
    }).join('');
};

window.loginWithEmail = async (nickname) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('nickname', nickname)
        .single();
    
    if (error || !profile || !profile.email) {
        alert("❌ У этого аккаунта не привязан email. Обратитесь к администратору.");
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert(`🔐 Для входа под ником "${nickname}" необходим email ${profile.email}`);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href
            }
        });
        return;
    }
    
    if (user.email !== profile.email) {
        alert(`❌ Несовпадение email!\n\nВы зашли как: ${user.email}\nАккаунт "${nickname}" привязан к: ${profile.email}\n\nВыйдите из текущего аккаунта и войдите под правильным.`);
        return;
    }
    
    localStorage.setItem('user_nick', nickname);
    localStorage.setItem('user_role', profile.role || 'Player');
    
    alert(`✅ Добро пожаловать, ${nickname}!`);
    location.reload();
};
loadRating();
