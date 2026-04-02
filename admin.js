import { supabase } from './config.js';
import { calculateMatchElo } from './elo.js';

export async function handleAddMatch() {
    const winNick = document.getElementById('win-input').value.trim();
    const lossNick = document.getElementById('loss-input').value.trim();
    const score = document.getElementById('score-select').value;
    const matchDate = document.getElementById('match-date').value; // ВОТ ОНО, СЧИТЫВАНИЕ ДАТЫ

    if (!winNick || !lossNick || !matchDate) return alert("Заполни все поля, включая дату!");

    // 1. Получаем данные игроков
    const { data: winP } = await supabase.from('profiles').select('*').eq('nickname', winNick).single();
    const { data: lossP } = await supabase.from('profiles').select('*').eq('nickname', lossNick).single();

    if (!winP || !lossP) return alert("Игрок не найден в базе!");

    // 2. Считаем позицию для бонуса
    const { data: all } = await supabase.from('profiles').select('nickname').order('elo', { ascending: false });
    const pos = all.findIndex(p => p.nickname === winNick) + 1;

    // 3. Математика Elo
    const res = calculateMatchElo(winP, lossP, score, all.length, pos);

    // 4. Обновляем Победителя (Эло + дата бонуса)
    await supabase.from('profiles').update({ 
        elo: winP.elo + res.total, 
        bonus: matchDate // Обновляем дату последнего бонуса на дату матча
    }).eq('nickname', winNick);

    // 5. Обновляем Проигравшего
    await supabase.from('profiles').update({ elo: lossP.elo - res.base }).eq('nickname', lossNick);

    // 6. Пишем в ИСТОРИЮ (строго по твоим колонкам со скрина)
    const [wS, lS] = score.split(':').map(Number);
    const { error } = await supabase.from('match_history').insert([{
        win: winNick,
        loss: lossNick,
        win_r: wS,
        loss_r: lS,
        date: matchDate, // ТЕПЕРЬ ТУТ НЕ БУДЕТ NULL
        "elo+": res.total,
        "bonus": res.bonus,
        "elo-": res.base
    }]);

    if (error) {
        console.error(error);
        alert("Ошибка записи в историю!");
    } else {
        // ТО САМОЕ ПОДРОБНОЕ СООБЩЕНИЕ
       alert(`Записано!\n${winNick}: +${res.total} (+${res.bonus})\n${lossNick}: -${res.base}`);
    }
}
