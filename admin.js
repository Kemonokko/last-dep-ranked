import { supabase } from './config.js';
import { calculateMatchElo } from './elo.js';

export async function handleAddMatch() {
    const winNick = document.getElementById('win-input').value.trim();
    const lossNick = document.getElementById('loss-input').value.trim();
    const score = document.getElementById('score-select').value;
    const matchDate = document.getElementById('match-date').value;

    if (!winNick || !lossNick || !matchDate) return alert("Заполни все поля!");

    const { data: winP } = await supabase.from('profiles').select('*').eq('nickname', winNick).single();
    const { data: lossP } = await supabase.from('profiles').select('*').eq('nickname', lossNick).single();

    if (!winP || !lossP) return alert("Игрок не найден!");

    const { data: all } = await supabase.from('profiles').select('nickname').order('elo', { ascending: false });
    const pos = all.findIndex(p => p.nickname === winNick) + 1;

    const res = calculateMatchElo(winP, lossP, score, all.length, pos);

    const oldBonusDate = winP.bonus; 

    await supabase.from('profiles').update({ elo: winP.elo + res.total, bonus: matchDate }).eq('nickname', winNick);
    await supabase.from('profiles').update({ elo: lossP.elo - res.base }).eq('nickname', lossNick);

    await supabase.from('match_history').insert([{
        win: winNick, loss: lossNick, win_r: score.split(':')[0], loss_r: score.split(':')[1],
        date: matchDate, "elo+": res.total, "bonus": res.bonus, "elo-": res.base, prev_bonus_date: oldBonusDate
    }]);
await refreshWinrate(winNick);
await refreshWinrate(lossNick);
    alert(`Записано!\n${winNick}: +${res.total} (+${res.bonus})\n${lossNick}: -${res.base}`);
    location.reload();
}

export async function deleteMatch(matchId) {
    if (!confirm("Аннулировать матч?")) return;

    const { data: match, error: matchError } = await supabase
        .from('match_history')
        .select('*')
        .eq('id', matchId)
        .single();

    if (matchError || !match) return alert("Матч не найден в базе!");

    const { data: winP } = await supabase.from('profiles').select('*').eq('nickname', match.win).single();
    const { data: lossP } = await supabase.from('profiles').select('*').eq('nickname', match.loss).single();

    if (!winP || !lossP) return alert("Игроки этого матча не найдены в профилях!");

    await supabase.from('profiles').update({ 
        elo: winP.elo - match["elo+"], 
        bonus: match.prev_bonus_date 
    }).eq('nickname', match.win);

    await supabase.from('profiles').update({ 
        elo: lossP.elo + match["elo-"] 
    }).eq('nickname', match.loss);

    await supabase.from('match_history').delete().eq('id', matchId);

    await Promise.all([
        refreshWinrate(match.win),
        refreshWinrate(match.loss)
    ]);

    alert("Матч аннулирован, рейтинг восстановлен!");
    location.reload();
}

window.handleAddMatch = handleAddMatch;
window.deleteMatch = deleteMatch;
export async function updateMatchPreview() {
    const winNick = document.getElementById('win-input').value.trim();
    const lossNick = document.getElementById('loss-input').value.trim();
    const score = document.getElementById('score-select').value;
    const previewBox = document.getElementById('match-preview');

    if (!winNick || !lossNick || winNick === lossNick) {
        previewBox.style.display = 'none';
        return;
    }

    const { data: winP } = await supabase.from('profiles').select('*').eq('nickname', winNick).single();
    const { data: lossP } = await supabase.from('profiles').select('*').eq('nickname', lossNick).single();

    if (winP && lossP) {
        const { data: all } = await supabase.from('profiles').select('nickname').order('elo', { ascending: false });
        const pos = all.findIndex(p => p.nickname === winNick) + 1;
        const res = calculateMatchElo(winP, lossP, score, all.length, pos);

        previewBox.style.display = 'block';
        previewBox.innerHTML = `
            <b>Прогноз:</b><br>
            ${winNick}: <span style="color:#00ff00">+${res.total}</span> (база ${res.base} + бонус ${res.bonus})<br>
            ${lossNick}: <span style="color:var(--blood)">-${res.base}</span>
        `;
    } else {
        previewBox.style.display = 'none';
    }
}

window.updateMatchPreview = updateMatchPreview;
async function refreshWinrate(nickname) {
    const { data: matches } = await supabase
        .from('match_history')
        .select('win, loss, win_r, loss_r')
        .or(`win.eq.${nickname},loss.eq.${nickname}`);

    if (!matches || matches.length === 0) {
        await supabase.from('profiles').update({ winrate: 0 }).eq('nickname', nickname);
        return;
    }

    let totalRounds = 0;
    let wonRounds = 0;

    matches.forEach(m => {
        const wR = Number(m.win_r);
        const lR = Number(m.loss_r);
        
        totalRounds += (wR + lR);

        if (m.win === nickname) {
            wonRounds += wR; 
        } else {
            wonRounds += lR; 
        }
    });

    const finalWR = Math.round((wonRounds / totalRounds) * 100);

    await supabase.from('profiles').update({ win_rate: finalWR }).eq('nickname', nickname);
}
