import { supabase } from './config.js';
import { getRankByPercentile } from './logic.js';

async function loadRating() {
    const { data: players, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

    if (error) {
        console.error('Ошибка Supabase:', error);
        return;
    }

    const container = document.getElementById('rating-list');
    const total = players.length;

    container.innerHTML = players.map((p, i) => {
        const rankName = getRankByPercentile(i + 1, total);
        const roleClass = (p.role || 'player').toLowerCase();
        
        return `
        <div class="match-card">
            <div class="avatar-circle" style="background-image: url('${p.avatar_url || ''}'); border-color: ${p.role === 'Founder' ? '#b64dff' : '#3d0000'}"></div>
            <div style="flex-grow: 1;">
                <div class="role-badge role-${roleClass}">${p.role || 'Player'}</div>
                <br>
                <b style="font-size: 1.1em;">${p.nickname}</b>
                <br>
                <div class="badge rank-${rankName}">${rankName}</div>
            </div>
            <div style="text-align: right;">
                <div class="elo-val">${p.elo}</div>
                <div style="font-size: 0.6em; color: #848e9c;">POINTS</div>
            </div>
        </div>`;
    }).join('');
}

loadRating();
