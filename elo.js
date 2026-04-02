import { getRankByPercentile } from './logic.js';

export function calculateMatchElo(winner, loser, score, totalPlayers, position) {
    const K = 60;
    
    // 1. Шанс победы (математика Elo)
    const expectedScore = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    let baseChange = Math.round(K * (1 - expectedScore));

    // 2. Множители за счет матча (твои правила)
    if (score === '3:0') baseChange *= 1.3;
    if (score === '3:1') baseChange *= 1.0;
    if (score === '3:2') baseChange *= 0.7;
    
    baseChange = Math.round(baseChange);

    // 3. Расчет бонуса (раз в 14 дней)
    let bonusValue = 0;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    
    // БЕРЕМ ДАТУ ИЗ ТВОЕЙ КОЛОНКИ "bonus"
    const lastBonusDate = winner.bonus ? new Date(winner.bonus).getTime() : 0;
    
    if (Date.now() - lastBonusDate > fourteenDays) {
        const rank = getRankByPercentile(position, totalPlayers);
        const bonusMap = {
            'Дракон': 0, 'S+': 1, 'S': 2, 'A+': 3, 
            'A': 4, 'B+': 5, 'B': 6, 'C': 7
        };
        bonusValue = bonusMap[rank] || 0;
    }

    return { total: baseChange + bonusValue, base: baseChange, bonus: bonusValue };
}
