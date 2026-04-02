import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';

let allPlayers = []; 

async function loadRating() {
    const { data: players, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

    if (error) {
        document.getElementById('rating-list').innerHTML = `<div style="color:red">Ошибка: ${error.message}</div>`;
        return;
    }

    allPlayers = players || [];
    renderPlayers(allPlayers);
}

function renderPlayers(list) {
    const container = document.getElementById('rating-list');
    if (!list.length) { container.innerHTML = "Никого не нашли"; return; }

    container.innerHTML = list.map((p, i) => {
        const rank = getRankByPercentile(allPlayers.indexOf(p) + 1, allPlayers.length);
        return `
        <div class="match-card">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}')"></div>
            <div style="flex-grow: 1;">
                <b style="color: white;">${p.nickname}</b><br>
                <div class="badge rank-${rank}">${rank}</div>
            </div>
            <div class="elo-val">${p.elo}</div>
        </div>`;
    }).join('');
}

document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    renderPlayers(allPlayers.filter(p => p.nickname.toLowerCase().includes(val)));
});

loadRating();
import { handleAddMatch } from './admin.js';
window.handleAddMatch = handleAddMatch;
