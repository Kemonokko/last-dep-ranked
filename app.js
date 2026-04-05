import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';
import { handleAddMatch } from './admin.js';
import { loadHistory } from './history.js';

let allPlayers = []; 
window.roleCache = {};

async function loadRating() {
    try {
        const { data: players, error } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
        
        if (error) {
            alert("ОШИБКА БАЗЫ: " + error.message);
            return;
        }

        // ЗАПОЛНЯЕМ ВСЕ СПИСКИ СРАЗУ
        allPlayers = players || [];
        window.allPlayers = allPlayers; 

        allPlayers.forEach(p => { 
            window.roleCache[p.nickname] = (p.role || 'Player').toString().trim(); 
        });

        // Теперь рендер точно увидит заполненный список и нарисует ранги
        renderPlayers(allPlayers);
    } catch (e) {
        console.error("Ошибка в loadRating:", e);
    }
}

// --- 2. ОТРИСОВКА КАРТОЧЕК ---
function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    if (!container) return;

    container.innerHTML = list.map((p) => {
        // Считаем позицию (используем ПЕРЕДАННЫЙ список list)
        const globalPos = list.findIndex(player => player.nickname === p.nickname) + 1;
        const rank = getRankByPercentile(globalPos, list.length);
        
        const role = (p.role || 'Player').toString().trim();
        const roleColors = { 'Founder': '#b64dff', 'Overseer': '#00ff00', 'Archivist': '#00ffff', 'Bloodline': '#880000', 'Player': '#ffffff' };
        const currentColor = roleColors[role] || '#ffffff';
        const hasGlow = role !== 'Player' ? `0 0 12px ${currentColor}88` : 'none';

        return `
        <div class="match-card" onclick="window.openProfile('${p.nickname}')">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${currentColor}; box-shadow: ${hasGlow};"></div>
            <div style="flex-grow: 1;">
                <b class="nick-hover role-${role.toLowerCase()}" style="font-size: 1.15em; color: white;">${p.nickname}</b><br>
                <!-- Используем span, чтобы ранг не растягивался -->
                <span class="badge rank-${rank}">${rank}</span>
            </div>
            <div style="text-align: right; min-width: 85px;">
                <div class="elo-val">${p.elo}</div>
                <div class="wr-val">${p.win_rate || 0}% WR</div>
            </div>
        </div>`;
    }).join('');
}

// --- 3. СИСТЕМНЫЕ ФУНКЦИИ (СБРОСЫ И ВЫХОД) ---
window.handleLogout = () => { localStorage.clear(); location.reload(); };
window.handleAddMatch = handleAddMatch;

window.resetAvatar = async (nick) => {
    if (!confirm(`Сбросить аватар игрока ${nick}?`)) return;
    await supabase.from('profiles').update({ avatar_url: '' }).eq('nickname', nick);
    alert("Аватар удален."); location.reload();
};

window.resetBio = async (nick) => {
    if (!confirm(`Очистить био игрока ${nick}?`)) return;
    await supabase.from('profiles').update({ bio: '' }).eq('nickname', nick);
    alert("БИО очищено!"); location.reload();
};

// --- ФИНАЛЬНЫЙ ЗАПУСК (БЕЗ ЛИШНИХ СКОБОК) ---
loadRating();
