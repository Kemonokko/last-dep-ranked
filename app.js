import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = [];
window.roleCache = {};

async function loadRating() {
  const { data: players, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
  if (error) {
    console.error("Ошибка загрузки профилей:", error);
    return;
  }
  window.allPlayers = players || [];
  
  window.allPlayers.forEach(p => {
    window.roleCache[p.nickname] = (p.role || 'Player').toLowerCase().trim();
  });
  
  renderPlayers(window.allPlayers);
  
  if (window.showRating) {
    const ratingList = document.getElementById('rating-list');
    if (ratingList) ratingList.style.display = 'block';
  }
}

function renderPlayers(list) {
  const container = document.getElementById('rating-list');
  if (!container) return;
  container.innerHTML = list.map((p, index) => {
    const globalPos = index + 1;
    const total = list.length;
    const rank = getRankByPercentile(globalPos, total);
    const role = (p.role || 'Player').toString().trim();
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const currentColor = roleColors[role] || '#ffffff';
    
    return `
    <div class="match-card" onclick="window.openProfile('${p.nickname}')">
      <!-- Аватарка (Цвет рамки берем из JS) -->
      <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor};"></div>
      <div style="flex-grow: 1; text-align: left;">
        <!-- НИК: Только классы. Цвет и свечение теперь в CSS -->
        <b class="nick-hover role-${role.toLowerCase()}">${p.nickname}</b><br>
        <!-- РАНГ: Только классы. Цвета и анимация Дракона — в CSS -->
        <span class="badge rank-${rank}">${rank}</span>
      </div>
      <!-- ЦИФРЫ: Используем твои переменные --gold из CSS -->
      <div style="text-align: right; min-width: 90px;">
        <div class="elo-val">${p.elo || 0}</div>
        <div class="wr-val">${p.win_rate || 0}% WR</div>
      </div>
    </div>`;
  }).join('');
}

window.openProfile = async (nick) => {
  const modal = document.getElementById('profile-modal');
  modal.style.display = 'flex';
  
  document.getElementById('prof-nick').innerText = "Загрузка...";
  document.getElementById('prof-avatar').style.backgroundImage = "none";
  document.getElementById('prof-elo').innerText = "-";
  document.getElementById('prof-wr').innerText = "-%";
  document.getElementById('prof-bio').innerText = "...";
  const rankTextClean = document.getElementById('prof-rank-text');
  if (rankTextClean) rankTextClean.innerHTML = "-";
  const badgeClean = document.getElementById('prof-role-badge');
  if (badgeClean) badgeClean.style.display = 'none';
  const gamesContainerClean = document.getElementById('prof-recent-games');
  if (gamesContainerClean) gamesContainerClean.innerHTML = '<div style="color:#666; font-size:0.8em; text-align:center; padding:10px;">Загрузка игр...</div>';
  
  const { data: p } = await supabase.from('profiles').select('*').eq('nickname', nick).single();
  if (!p) return;
  
  const globalPos = window.allPlayers.findIndex(player => player.nickname === p.nickname) + 1;
  const rank = getRankByPercentile(globalPos, window.allPlayers.length);
  
  document.getElementById('prof-nick').innerText = p.nickname;
  document.getElementById('prof-avatar').style.backgroundImage = `url('${p.avatar_url || ''}')`;
  document.getElementById('prof-elo').innerText = p.elo;
  document.getElementById('prof-wr').innerText = (p.win_rate || 0) + '%';
  document.getElementById('prof-bio').innerText = p.bio || "Пусто...";
  
  const rankText = document.getElementById('prof-rank-text');
  if (rankText) {
    rankText.innerHTML = `<span class="badge rank-${rank}" style="font-size: 0.7em !important; padding: 2px 8px !important; line-height: 1.2;">${rank}</span>`;
    rankText.className = "";
  }
  
  const role = (p.role || 'Player').trim();
  const badge = document.getElementById('prof-role-badge');
  if (badge) {
    if (role === 'Player') {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'inline-block';
      badge.innerText = role.toUpperCase();
      const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000' };
      badge.style.color = roleColors[role] || '#ffffff';
      badge.style.borderColor = roleColors[role] || '#ffffff';
    }
  }
  
  const gamesContainer = document.getElementById('prof-recent-games');
  
  supabase.from('match_history')
    .select('*')
    .or(`win.eq."${nick}",loss.eq."${nick}"`)
    .order('date', { ascending: false })
    .limit(3)
    .then(({ data: matches }) => {
      if (gamesContainer) {
        gamesContainer.innerHTML = matches && matches.length > 0 ? matches.map(m => {
          const isWin = m.win === nick;
          const oppNick = isWin ? m.loss : m.win;
          const resColor = isWin ? '#00ff00' : '#ff0000';
          const oppRole = (window.roleCache[oppNick] || 'Player').toLowerCase();
          
          return `
          <div class="history-item-mini" onclick="window.openProfile('${oppNick}')"
               style="background: #201717 !important; padding: 10px; border-radius: 15px; display: flex; align-items: center; margin-bottom: 8px; border: 1.5px solid #3d0000 !important; transition: 0.3s; cursor: pointer;">
            <!-- Статус (WIN/LOSS) -->
            <div style="background: ${resColor}33; color: ${resColor}; padding: 6px 12px; border-radius: 20px; font-weight: 900; font-size: 0.7em; text-align: center; min-width: 45px; border: 1px solid ${resColor}66;">
              ${isWin ? 'WIN' : 'LOSS'}
            </div>
            <!-- Счёт -->
            <div style="margin: 0 15px; font-weight: 900; color: var(--gold); font-size: 1.1em; min-width: 35px; text-align: center;">
              ${m.win_r}:${m.loss_r}
            </div>
            <!-- НИК -->
            <div style="flex-grow: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <b class="nick-hover role-${oppRole}" style="font-size: 1.1em !important;">${oppNick}</b>
            </div>
          </div>`;
        }).join('') : '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
      }
    })
    .catch((err) => {
      console.error("Ошибка загрузки истории:", err);
      if (gamesContainer) {
        gamesContainer.innerHTML = '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
      }
    });
  
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
        <button onclick="window.resetBio('${p.nickname}')" style="background:#111; color:var(--gold); border:1px solid var(--gold); padding:8px; border-radius:8px; font-size:0.7em; cursor:pointer; font-weight:bold;">✍ БИО</button>
      </div>
    `;
    modal.querySelector('div').appendChild(modDiv);
  }
};

window.showMyProfile = () => {
  const searchInput = document.getElementById('search');
  const userNick = localStorage.getItem('user_nick');
  const userRole = localStorage.getItem('user_role') || 'Player';
  
  document.getElementById('my-profile-section').style.display = 'block';
  document.getElementById('rating-list').style.display = 'none';
  document.getElementById('history-list').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-profile').classList.add('active');
  
  if (userNick) {
    if (searchInput) searchInput.style.display = 'none';
    document.getElementById('rating-list').style.display = 'none';
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('cabinet-ui').style.display = 'block';
    document.getElementById('cabinet-nick').innerText = userNick;
    
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
      if (adminPanel) adminPanel.style.display = 'none';
    } else {
      if (adminBtn) adminBtn.style.display = 'none';
      if (adminPanel) adminPanel.style.display = 'none';
    }
    
    const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
    const roleBadge = document.getElementById('cabinet-role');
    if (roleBadge) {
      roleBadge.innerText = userRole.toUpperCase();
      roleBadge.style.color = roleColors[userRole] || '#ffffff';
      roleBadge.style.borderColor = roleColors[userRole] || '#ffffff';
    }
  } else {
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
    container.innerHTML = `<div style="text-align:center; padding:30px; color:#888;"><h2>🔐 ВХОД</h2><p>Начните вводить свой ник...</p></div>`;
    return;
  }
  const matches = window.allPlayers.filter(p => p.nickname.toLowerCase().includes(val));
  if (matches.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ff4444;">❌ ИГРОК НЕ НАЙДЕН</div>`;
    return;
  }
  container.innerHTML = matches.map(p => {
    const pos = window.allPlayers.findIndex(player => player.nickname === p.nickname) + 1;
    const rank = getRankByPercentile(pos, window.allPlayers.length);
    const role = (p.role || 'Player').toLowerCase();
    return `
    <div class="match-card" style="justify-content: space-between; align-items: center; background: #111 !important; border: 1.5px solid #222 !important;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: #333;"></div>
        <div style="text-align: left;">
          <b class="nick-hover role-${role}" style="color: white; font-size: 1.1em;">${p.nickname}</b><br>
          <span class="badge rank-${rank}">${rank}</span>
        </div>
      </div>
      <button onclick="window.loginWithEmail('${p.nickname}')" style="background: var(--blood); border: none; color: white; padding: 10px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s;">
        ВОЙТИ
      </button>
    </div>`;
  }).join('');
};

window.loginWithEmail = async (nickname) => {
  const { data: profile, error } = await supabase.from('profiles').select('email, role').eq('nickname', nickname).single();
  if (error || !profile || !profile.email) return alert("❌ У профиля не настроен вход через Email.");
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert(`🔐 Для входа под ником "${nickname}" подтвердите личность через Google.`);
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://vercel.app' } });
    return;
  }
  if (session.user.email !== profile.email) return alert(`❌ Ошибка доступа! Ваш Google-аккаунт не привязан к нику "${nickname}".`);
  
  localStorage.setItem('user_nick', nickname);
  localStorage.setItem('user_role', profile.role || 'Player');
  alert(`✅ Добро пожаловать, ${nickname}!`);
  location.reload();
};

window.updateProfileData = async () => {
  const nick = localStorage.getItem('user_nick');
  const bioInput = document.getElementById('new-bio');
  
  if (!bioInput) {
    return alert("❌ Ошибка: Текстовое поле ввода био не найдено в HTML!");
  }
  
  const bio = bioInput.value.trim();
  
  if (!nick) {
    return alert("❌ Ошибка: Сайт не знает твой ник! Попробуй перезайти в аккаунт.");
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ bio: bio })
    .eq('nickname', nick)
    .select();
  
  if (error) {
    console.error("Ошибка Supabase:", error);
    return alert("❌ База данных отклонила запрос: " + error.message);
  }
  
  if (!data || data.length === 0) {
    return alert("⚠️ База вернула пустой ответ. Проверь, совпадает ли твой ник в localStorage с ником в таблице профилей!");
  }
  
  alert("✅ Био успешно сохранено в базу данных!");
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

window.showRating = () => {
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.style.display = 'block';
  }
  document.getElementById('rating-list').style.display = 'block';
  document.getElementById('history-list').style.display = 'none';
  document.getElementById('my-profile-section').style.display = 'none';
  
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (document.getElementById('btn-rating')) {
    document.getElementById('btn-rating').classList.add('active');
  }
  if (window.allPlayers) {
    renderPlayers(window.allPlayers);
  }
};

window.showHistory = () => {
  if (document.getElementById('search')) document.getElementById('search').style.display = 'none';
  document.getElementById('rating-list').style.display = 'none';
  document.getElementById('history-list').style.display = 'block';
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
    location.reload();
  }
};

window.resetAvatar = async (nick) => {
  if (!confirm(`Сбросить аватар игрока ${nick}?`)) return;
  const { error } = await supabase.from('profiles').update({ avatar_url: '' }).eq('nickname', nick);
  if (error) return alert("Ошибка при сбросе авы");
  alert("Аватар удален.");
  location.reload();
};

window.resetBio = async (nick) => {
  if (!confirm(`Очистить описание (био) игрока ${nick}?`)) return;
  const { error } = await supabase.from('profiles').update({ bio: '' }).eq('nickname', nick);
  if (error) return alert("Ошибка при сбросе био");
  alert("Описание очищено.");
  location.reload();
};

window.handleSearch = () => {
  const val = document.getElementById('search').value.toLowerCase().trim();
  const isProfileSection = document.getElementById('my-profile-section').style.display === 'block';
  
  if (!val) {
    renderPlayers(window.allPlayers);
    return;
  }
  if (isProfileSection && !localStorage.getItem('user_nick')) {
    window.filterPlayersForLogin();
  } else {
    const filtered = window.allPlayers.filter(p => p.nickname.toLowerCase().includes(val));
    renderPlayers(filtered);
  }
};

window.handleFileSelected = (input) => {
  const text = document.getElementById('file-name-text');
  const btn = document.getElementById('ava-btn');
  if (input.files && input.files[0]) {
    text.innerText = `Выбран: ${input.files[0].name}`;
    btn.style.display = 'block';
  } else {
    text.innerText = "Файл не выбран";
    btn.style.display = 'none';
  }
};

window.uploadAvatarFile = async () => {
  const nick = localStorage.getItem('user_nick');
  const fileInput = document.getElementById('avatar-file-input');
  
  if (!nick) return alert("❌ Вы не авторизованы!");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    return alert("❌ Сначала выберите файл!");
  }
  
  const file = fileInput.files[0];
  
  const { data: p, error: fetchError } = await supabase.from('profiles').select('role, avatar_changes').eq('nickname', nick).single();
  if (fetchError || !p) return alert("❌ Ошибка: Профиль игрока не найден в базе.");
  
  if (p.role === 'Player' && (p.avatar_changes || 0) >= 1) {
    return alert("❌ Ошибка: Обычные игроки могут менять аватарку только 1 раз");
  }

  const fileExt = file.name.split('.').pop();
const randomId = Math.random().toString(36).substring(2, 9);
const filePath = `avatar-${randomId}-${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);
    
  if (uploadError) {
    console.error(uploadError);
    return alert("❌ Ошибка хранилища при загрузке: " + uploadError.message);
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
    
  const { error: updateError } = await supabase.from('profiles').update({
    avatar_url: publicUrl,
    avatar_changes: (p.avatar_changes || 0) + 1
  }).eq('nickname', nick);
  
  if (updateError) {
    console.error(updateError);
    return alert("❌ Ошибка привязки ссылки к профилю: " + updateError.message);
  }
  
  alert("✅ Новая аватарка успешно загружена!");
  location.reload();
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadRating();
});
