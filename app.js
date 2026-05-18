import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = [];
window.roleCache = {};
let isRatingLoading = false;

async function loadRating() {
  if (isRatingLoading) return;
  isRatingLoading = true;

  try {
    const response = await fetch('/api/get-profiles');
    if (!response.ok) throw new Error('Ошибка сервера при загрузке профилей');
    
    const players = await response.json();

    window.allPlayers = players || [];
    window.roleCache = {};
    window.allPlayers.forEach(p => {
      window.roleCache[p.nickname] = (p.role || 'Player').toLowerCase().trim();
    });

    renderPlayers(window.allPlayers);

    if (window.showRating) {
      const ratingList = document.getElementById('rating-list');
      if (ratingList) ratingList.style.display = 'block';
    }
  } catch (error) {
    console.error("Ошибка загрузки профилей через Vercel API:", error);
  } finally {
    isRatingLoading = false;
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
      <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor};"></div>
      <div style="flex-grow: 1; text-align: left;">
        <b class="nick-hover role-${role.toLowerCase()}">${p.nickname}</b><br>
        <span class="badge rank-${rank}">${rank}</span>
      </div>
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

  const gamesContainer = document.getElementById('prof-recent-games');
  if (gamesContainer) {
    gamesContainer.innerHTML = '<div style="color:#666; font-size:0.8em; text-align:center; padding:10px;">Загрузка игр...</div>';
  }

const p = window.allPlayers.find(player => player.nickname === nick);
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

  fetch(`/api/match-history?username=${encodeURIComponent(nick)}`)
    .then(response => {
      if (!response.ok) throw new Error('Ошибка сервера');
      return response.json();
    })
    .then((matches) => {
      if (gamesContainer) {
        gamesContainer.innerHTML = matches && matches.length > 0 ? matches.map(m => {
          const isWin = m.win === nick;
          const oppNick = isWin ? m.loss : m.win;
          const resColor = isWin ? '#00ff00' : '#ff0000';
          const oppRole = (window.roleCache[oppNick] || 'Player').toLowerCase();

          const clickAction = oppNick === nick ? '' : `onclick="window.openProfile('${oppNick}')"`;
          const cursorStyle = oppNick === nick ? 'default' : 'pointer';

          return `
          <div class="history-item-mini" ${clickAction}
               style="background: #201717 !important; padding: 10px; border-radius: 15px; display: flex; align-items: center; margin-bottom: 8px; border: 1.5px solid #3d0000 !important; transition: 0.3s; cursor: ${cursorStyle};">
            <div style="background: ${resColor}33; color: ${resColor}; padding: 6px 12px; border-radius: 20px; font-weight: 900; font-size: 0.7em; text-align: center; min-width: 45px; border: 1px solid ${resColor}66;">
              ${isWin ? 'WIN' : 'LOSS'}
            </div>
            <div style="margin: 0 15px; font-weight: 900; color: var(--gold); font-size: 1.1em; min-width: 35px; text-align: center;">
              ${m.win_r}:${m.loss_r}
            </div>
            <div style="flex-grow: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <b class="nick-hover role-${oppRole}" style="font-size: 1.1em !important;">${oppNick}</b>
            </div>
          </div>`;
        }).join('') : '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
      }
    })
    .catch((err) => {
      console.error("Ошибка загрузки истории через Vercel API:", err);
      if (gamesContainer) {
        gamesContainer.innerHTML = '<div style="color:#444; font-size:0.8em; text-align:center; padding:10px;">Матчей еще не было</div>';
      }
    });

  const oldMod = document.getElementById('mod-tools');
  if (oldMod) oldMod.remove();

  const myRole = localStorage.getItem('user_role');
  if (['Founder', 'Overseer', 'Archivist'].includes(myRole)) {
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
      </div>`;
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
    document.getElementById('cabinet-ui').style.display = 'block';
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('cabinet-nick').innerText = userNick;

    const bioField = document.getElementById('new-bio');
    if (bioField) bioField.value = localStorage.getItem('user_bio') || "";

    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) adminBtn.style.display = (userRole === 'Founder' || userRole === 'Archivist') ? 'block' : 'none';
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
        <h2>🔐 Вход</h2><p>Для входа введи ник в поиск</p>
      </div>`;
    loadAllPlayersForSearch();
  }
};

window.filterPlayers = () => {
  const val = document.getElementById('search').value.toLowerCase().trim();
  document.querySelectorAll('.match-card').forEach(p => {
    p.style.display = p.innerText.toLowerCase().includes(val) ? 'flex' : 'none';
  });
};

window.handleLogout = () => { localStorage.clear(); location.reload(); };
window.handleAddMatch = handleAddMatch;
document.getElementById('close-profile').onclick = () => { document.getElementById('profile-modal').style.display = 'none'; };

async function loadAllPlayersForSearch() {
  const { data: searchPlayers, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
  if (!error && searchPlayers) window.allPlayers = searchPlayers;
}

window.filterPlayersForLogin = () => {
  const val = document.getElementById('search').value.toLowerCase().trim();
  const container = document.getElementById('rating-list');
  if (!val) return;
  const matches = window.allPlayers.filter(p => p.nickname.toLowerCase().includes(val));
  container.innerHTML = matches.map(p => `
    <div class="match-card" style="justify-content: space-between; background: #111 !important;">
      <b class="role-${(p.role || 'Player').toLowerCase()}">${p.nickname}</b>
      <button onclick="window.loginWithEmail('${p.nickname}')" style="background:var(--blood); color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:900;">ВОЙТИ</button>
    </div>`).join('');
};

window.loginWithEmail = async (nickname) => {
  const { data: profile } = await supabase.from('profiles').select('email, role').eq('nickname', nickname).single();
  if (!profile || !profile.email) return alert("У профиля не настроен Email.");
  localStorage.setItem('user_nick', nickname);
  localStorage.setItem('user_role', profile.role || 'Player');
  alert(`✅ Добро пожаловать, ${nickname}!`);
  location.reload();
};

window.updateProfileData = async () => {
  const nick = localStorage.getItem('user_nick');
  const bioText = document.getElementById('new-bio')?.value.trim() || "";
  if (!nick) return alert("Вы не авторизованы!");

  const { error } = await supabase.from('profiles').update({ bio: bioText }).eq('nickname', nick);
  if (error) return alert("Ошибка сохранения био: " + error.message);

  localStorage.setItem('user_bio', bioText);
  alert("✅ Био успешно сохранено!");
  location.reload();
};

window.handleFileSelected = (input) => {
  const text = document.getElementById('file-name-text');
  const btn = document.getElementById('ava-btn');
  if (input.files && input.files) {
    text.innerText = `Выбран: ${input.files.name}`;
    btn.style.display = 'block';
  }
};

window.uploadAvatarFile = async () => {
  const nick = localStorage.getItem('user_nick');
  const fileInput = document.getElementById('avatar-file-input');
  if (!nick || !fileInput?.files?.[0]) return alert("Выберите файл!");

  const file = fileInput.files[0];
  const fileExt = file.name.split('.').pop();
  const randomId = Math.random().toString(36).substring(2, 9);
  const filePath = `avatar-${randomId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
  if (uploadError) return alert("Ошибка загрузки файла: " + uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('nickname', nick);

  alert("✅ Аватарка успешно загружена!");
  location.reload();
};

window.showRating = () => {
  document.getElementById('search').style.display = 'block';
  document.getElementById('rating-list').style.display = 'block';
  document.getElementById('history-list').style.display = 'none';
  document.getElementById('my-profile-section').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-rating').classList.add('active');
  loadRating();
};

window.showHistory = () => {
  document.getElementById('search').style.display = 'none';
  document.getElementById('rating-list').style.display = 'none';
  document.getElementById('history-list').style.display = 'block';
  document.getElementById('my-profile-section').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-history').classList.add('active');

  const historyList = document.getElementById('history-list');
  if (historyList) historyList.innerHTML = '<div style="color:var(--gold); text-align:center; padding:20px; font-weight:bold;">Загрузка истории матчей...</div>';

  setTimeout(() => {
    if (typeof loadHistory === 'function') loadHistory();
  }, 50);
};

window.resetAvatar = async (nick) => {
  await supabase.from('profiles').update({ avatar_url: '' }).eq('nickname', nick);
  location.reload();
};

window.resetBio = async (nick) => {
  await supabase.from('profiles').update({ bio: '' }).eq('nickname', nick);
  location.reload();
};

window.handleSearch = () => {
  const val = document.getElementById('search').value.toLowerCase().trim();
  if (!val) return renderPlayers(window.allPlayers);
  renderPlayers(window.allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadRating();
});
