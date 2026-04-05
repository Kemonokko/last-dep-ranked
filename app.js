import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {};

function renderPlayers(list) {
    console.log("🎨 Начинаю рендер списка...");
    const container = document.getElementById('rating-list');
    
    if (!container) {
        alert("❌ ОШИБКА: Элемент 'rating-list' не найден в HTML!");
        return;
    }

    try {
        container.innerHTML = list.map((p) => {
            const globalPos = list.findIndex(player => player.nickname === p.nickname) + 1;
            
            // Проверка функции ранга
            let rank = "Ошибка";
            try {
                rank = getRankByPercentile(globalPos, list.length);
            } catch(rankErr) {
                console.error("Ошибка в getRankByPercentile:", rankErr);
            }

            const role = (p.role || 'Player').toString().trim();
            const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
            const currentColor = roleColors[role] || '#ffffff';
            const hasGlow = role !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';

            return `
            <div class="match-card" onclick="window.openProfile('${p.nickname}')">
                <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
                <div style="flex-grow: 1;">
                    <b class="nick-hover role-${role.toLowerCase()}" style="font-size: 1.15em; color: white;">${p.nickname}</b><br>
                    <span class="badge rank-${rank}">${rank}</span>
                </div>
                <div style="text-align: right; min-width: 85px;">
                    <div class="elo-val">${p.elo}</div>
                    <div class="wr-val">${p.win_rate || 0}% WR</div>
                </div>
            </div>`;
        }).join('');
        console.log("🏁 Рендер завершен успешно!");
    } catch (e) {
        alert("⛔ ОШИБКА ВНУТРИ renderPlayers: " + e.message);
    }
}

async function loadRating() {
}
    // --- 4. ПЛАШКА РОЛИ (Скрываем для обычных игроков) ---
    const role = (p.role || 'Player').trim();
    const badge = document.getElementById('prof-role-badge');
    if (badge) {
        if (role === 'Player') {
            badge.style.display = 'none'; // Полностью убираем плашку, если игрок обычный
        } else {
            badge.style.display = 'inline-block';
            badge.innerText = role.toUpperCase();
            const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000' };
            badge.style.color = roleColors[role] || '#ffffff';
            badge.style.borderColor = roleColors[role] || '#ffffff';
        }
    }

    // 5. ПОСЛЕДНИЕ ИГРЫ
    const { data: matches } = await supabase.from('match_history').select('*').or(`win.eq."${nick}",loss.eq."${nick}"`).order('date', { ascending: false }).limit(3);
    const gamesContainer = document.getElementById('prof-recent-games');
    if (gamesContainer) {
        gamesContainer.innerHTML = matches && matches.length > 0 ? matches.map(m => {
            const isWin = m.win === nick;
            const oppNick = isWin ? m.loss : m.win;
            const resColor = isWin ? '#00ff00' : '#ff0000';
            const oppRole = (window.roleCache[oppNick] || 'Player').toLowerCase();
            return `
            <div class="history-item-mini" style="background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; border-left: 3px solid ${resColor}; transition: 0.2s;">
                <span style="color:${resColor}; font-weight:bold; font-size:0.7em; width:35px;">${isWin ? 'WIN' : 'LOSS'}</span>
                <b class="nick-hover role-${oppRole}" 
                   onclick="event.stopPropagation(); window.openProfile('${oppNick}')" 
                   style="cursor:pointer; flex:1; text-align:left; margin-left:10px; font-size:0.9em; color:white;">${oppNick}</b>
                <span style="font-weight:bold; color:var(--gold); font-size:0.9em;">${m.win_r}:${m.loss_r}</span>
            </div>`;
        }).join('') : '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
    }
    // --- БЛОК МОДЕРАЦИИ (FOUNDER, OVERSEER, ARCHIVIST) ---
    const oldMod = document.getElementById('mod-tools');
    if (oldMod) oldMod.remove();

    const myRole = localStorage.getItem('user_role');
    const isModerator = ['Founder', 'Overseer', 'Archivist'].includes(myRole);

    if (isModerator) {
        const modDiv = document.createElement('div');
        modDiv.id = 'mod-tools';
        modDiv.style.marginTop = '20px';
        modDiv.style.borderTop = '1px dashed #444';
        modDiv.style.paddingTop = '15px';
        modDiv.innerHTML = `
            <div style="font-size:0.6em; color:#555; margin-bottom:10px; font-weight:bold; text-align:center;">MOD TOOLS</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="window.resetAvatar('${p.nickname}')" style="background:#111; color:#ff4444; border:1px solid #ff4444; padding:8px; border-radius:8px; font-size:0.7em; cursor:pointer; font-weight:bold;">❌ АВА</button>
                <button onclick="window.resetBio('${p.nickname}')" style="background:#111; color:var(--gold); border:1px solid var(--gold); padding:8px; border-radius:8px; font-size:0.7em; cursor:pointer; font-weight:bold;">✍️ БИО</button>
            </div>
        `;
        modal.querySelector('div').appendChild(modDiv);
    };

// 4. ЛИЧНЫЙ КАБИНЕТ И АДМИНКА
window.showMyProfile = () => {
    const searchInput = document.getElementById('search');
    const userNick = localStorage.getItem('user_nick');
    const userRole = localStorage.getItem('user_role') || 'Player';
    
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
        
        // --- ЛОГИКА АДМИНКИ ---
        const adminBtn = document.getElementById('admin-btn');
        const adminPanel = document.getElementById('admin-panel');

        if (userRole === 'Founder' || userRole === 'Archivist') {
            if (adminBtn) {
                adminBtn.style.display = 'block';
                adminBtn.onclick = () => {
                    const isHidden = adminPanel.style.display === 'none';
                    adminPanel.style.display = isHidden ? 'block' : 'none';
                };
            }
            if (adminPanel) adminPanel.style.display = 'none'; // По умолчанию скрыта
        } else {
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'none';
        }

        // --- ЦВЕТА И ТЕКСТ РОЛИ В КАБИНЕТЕ ---
        const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
        const roleBadge = document.getElementById('cabinet-role');
        if (roleBadge) {
            roleBadge.innerText = userRole.toUpperCase();
            roleBadge.style.color = roleColors[userRole] || '#ffffff';
            roleBadge.style.borderColor = roleColors[userRole] || '#ffffff';
        }
    } else {
        // Логика когда не залогинен (вход через поиск)
        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.value = "";
            searchInput.placeholder = "Поиск...";
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

// 5. ФИЛЬТРАЦИЯ (ПОИСК)
window.filterPlayers = () => {
    const val = document.getElementById('search').value.toLowerCase().trim();
    const isProfileTab = document.getElementById('my-profile-section').style.display === 'block';
    const isHistoryTab = document.getElementById('btn-history').classList.contains('active');
    
    const players = document.querySelectorAll('.match-card');
    players.forEach(p => {
        const matches = p.innerText.toLowerCase().includes(val);
        if (isHistoryTab) p.style.display = 'none';
        else if (isProfileTab) p.style.display = (val.length > 0 && matches) ? 'flex' : 'none';
        else p.style.display = matches ? 'flex' : 'none';
    });

    const matchesList = document.querySelectorAll('.history-item');
    matchesList.forEach(m => {
        const fits = m.innerText.toLowerCase().includes(val);
        m.style.display = (isHistoryTab && fits) ? 'flex' : 'none';
    });
};

// 6. СИСТЕМНЫЕ ФУНКЦИИ
window.handleLogout = () => { localStorage.clear(); location.reload(); };
window.handleAddMatch = handleAddMatch;
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

async function loadAllPlayersForSearch() {
    const { data: players } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
    if (players) {
        window.allPlayers = players;
        players.forEach(p => { window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); });
    }
}

window.filterPlayersForLogin = () => {
    const val = document.getElementById('search').value.toLowerCase().trim();
    const container = document.getElementById('rating-list');
    if (!val) {
        container.innerHTML = `<div style="text-align:center; padding:30px;"><h2>🔐 Вход</h2><p>Поиск</p></div>`;
        return;
    }
    const matches = window.allPlayers.filter(p => p.nickname.toLowerCase().includes(val));
    if (matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">❌ Игрок не найден</div>`;
        return;
    }
    container.innerHTML = matches.map(p => {
        const rank = getRankByPercentile(window.allPlayers.findIndex(player => player.nickname === p.nickname) + 1, window.allPlayers.length);
        return `<div class="match-card" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}');"></div>
                <div><b style="color: white;">${p.nickname}</b><br><div class="badge rank-${rank}">${rank}</div></div>
            </div>
            <button onclick="window.loginWithEmail('${p.nickname}')" style="background:var(--blood); border:none; color:white; padding:8px 20px; border-radius:10px; font-weight:bold; cursor:pointer;">ВОЙТИ</button>
        </div>`;
    }).join('');
};

window.loginWithEmail = async (nickname) => {
    const { data: profile, error } = await supabase.from('profiles').select('email, role').eq('nickname', nickname).single();
    if (error || !profile || !profile.email) return alert("❌ У профиля не настроен вход через Email.");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert(`🔐 Для входа под ником "${nickname}" подтвердите личность через Google.`);
        await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://last-dep-ranked.vercel.app' } });
        return;
    }
    if (session.user.email !== profile.email) return alert(`❌ Ошибка доступа! Ваш Google-аккаунт не привязан к нику "${nickname}".`);
    
    localStorage.setItem('user_nick', nickname);
    localStorage.setItem('user_role', profile.role || 'Player');
    alert(`✅ Добро пожаловать, ${nickname}!`);
    location.reload();
};

// 7. ОБНОВЛЕНИЕ ДАННЫХ ПРОФИЛЯ
window.updateProfileData = async () => {
    const nick = localStorage.getItem('user_nick');
    const bio = document.getElementById('new-bio')?.value || "";
    const { error } = await supabase.from('profiles').update({ bio: bio }).eq('nickname', nick);
    if (error) return alert("Ошибка сохранения био");
    alert("✅ Профиль обновлен!");
    location.reload();
};

window.updateAvatar = async () => {
    const nick = localStorage.getItem('user_nick');
    const url = document.getElementById('new-avatar-url').value.trim();
    if (!url) return alert("Вставь ссылку!");

    const { data: p } = await supabase.from('profiles').select('role, avatar_changes').eq('nickname', nick).single();

    if (p.role === 'Player' && (p.avatar_changes || 0) >= 1) {
        return alert("❌ Ошибка: Обычные игроки могут менять аватарку только 1 раз");
    }

    const { error } = await supabase.from('profiles').update({ 
        avatar_url: url, 
        avatar_changes: (p.avatar_changes || 0) + 1 
    }).eq('nickname', nick);

    if (error) return alert("Ошибка при смене авы");
    alert("✅ Аватарка успешно изменена!");
    location.reload();
};

// Навигация
window.showRating = () => { 
    const s = document.getElementById('search'); if(s) s.style.display = 'block';
    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-rating').classList.add('active');
    loadRating(); 
};

window.showHistory = () => { 
    const s = document.getElementById('search'); if(s) s.style.display = 'block';
    document.getElementById('rating-list').style.display = 'block'; 
    document.getElementById('my-profile-section').style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-history').classList.add('active');
    loadHistory(); 
};
window.createNewPlayer = async () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();

    if (!nick || !email) return alert("Заполни и ник, и почту!");

    const { data: existing } = await supabase.from('profiles').select('nickname').eq('nickname', nick).single();
    if (existing) return alert("❌ Игрок с таким ником уже есть!");

    const { error } = await supabase.from('profiles').insert([{ 
        nickname: nick, 
        email: email, 
        elo: 1500, 
        role: 'Player',
        avatar_changes: 0,
        bio: 'Пусто...'
    }]);

    if (error) {
        console.error(error);
        alert("Ошибка при создании: " + error.message);
    } else {
        alert(`✅ Игрок ${nick} успешно зарегистрирован!`);
        location.reload();}
};
// СБРОС АВАТАРКИ
window.resetAvatar = async (nick) => {
    if (!confirm(`Сбросить аватар игрока ${nick}?`)) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: '' }).eq('nickname', nick);
    if (error) return alert("Ошибка при сбросе авы");
    alert("Аватар удален.");
    location.reload();
};

// СБРОС БИО
window.resetBio = async (nick) => {
    if (!confirm(`Очистить описание (био) игрока ${nick}?`)) return;
    const { error } = await supabase.from('profiles').update({ bio: '' }).eq('nickname', nick);
    if (error) return alert("Ошибка при сбросе био");
    alert("Описание очищено.");
    location.reload();
};
    loadRating();
