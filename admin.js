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

    // СОХРАНЯЕМ СТАРУЮ ДАТУ БОНУСА ПЕРЕД ОБНОВЛЕНИЕМ
    const oldBonusDate = winP.bonus; 

    // Обновляем Победителя
    await supabase.from('profiles').update({ 
        elo: winP.elo + res.total, 
        bonus: matchDate 
    }).eq('nickname', winNick);

    // Обновляем Проигравшего
    await supabase.from('profiles').update({ elo: lossP.elo - res.base }).eq('nickname', lossNick);

    // ПИШЕМ В ИСТОРИЮ (включая старую дату для отката)
    const [wS, lS] = score.split(':').map(Number);
    await supabase.from('match_history').insert([{
        win: winNick,
        loss: lossNick,
        win_r: wS,
        loss_r: lS,
        date: matchDate,
        "elo+": res.total,
        "bonus": res.bonus,
        "elo-": res.base,
        prev_bonus_date: oldBonusDate // ВОТ ОНО!
    }]);

    alert(`Записано!\n${winNick}: +${res.total} (+${res.bonus})\n${lossNick}: -${res.base}`);
    location.reload();
}
