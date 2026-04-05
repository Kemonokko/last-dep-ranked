export function getRankByPercentile(position, total) {
    // МАЯЧОК 3: Что пришло на вход в математику
    console.log(`Математика ранга: pos=${position}, total=${total}`);

    if (!total || total === 0) return 'C'; 
    
    const p = (position / total) * 100;
    
    // МАЯЧОК 4: Какой процент получился
    console.log(`Процент для расчета: ${p}%`);
    if (p <= 3) return 'Дракон';
    if (p <= 9) return 'S+';
    if (p <= 18) return 'S';
    if (p <= 30) return 'A+';
    if (p <= 45) return 'A';
    if (p <= 63) return 'B+';
    if (p <= 84) return 'B';
    return 'C';
}
