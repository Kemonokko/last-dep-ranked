import { supabase } from './config.js';
import { calculateMatchElo } from './elo.js';

// ФУНКЦИЯ ЗАПИСИ МАТЧА
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

    alert(`Записано!\n${winNick}: +${res.total} (+${res.bonus})\n${lossNick}: -${res.base}`);
    location.reload();
}

// ФУНКЦИЯ УДАЛЕНИЯ (ОТКАТА) МАТЧА
export async function deleteMatch(matchId) {
    if (!confirm("Аннулировать матч? Эло и дата бонуса вернутся назад.")) return;

    const { data: match } = await supabase.from('match_history').select('*').eq('id', matchId).single();
    if (!match) return;

    const { data: winP } = await supabase.from('profiles').select('*').eq('nickname', match.win).single();
    const { data: lossP } = await supabase.from('profiles').select('*').eq('nickname', match.loss).single();

    await supabase.from('profiles').update({ elo: winP.elo - match["elo+"], bonus: match.prev_bonus_date }).eq('nickname', match.win);
    await supabase.from('profiles').update({ elo: lossP.elo + match["elo-"] }).eq('nickname', match.loss);

    await supabase.from('match_history').delete().eq('id', matchId);

    alert("Матч аннулирован!");
    location.reload();
}

// ДЕЛАЕМ ФУНКЦИИ ВИДИМЫМИ ДЛЯ HTML
window.handleAddMatch = handleAddMatch;
window.deleteMatch = deleteMatch;
