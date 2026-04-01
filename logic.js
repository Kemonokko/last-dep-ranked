export function getRankByPercentile(position, total) {
    const p = (position / total) * 100;
    if (p <= 3) return 'Дракон';
    if (p <= 9) return 'S+';
    if (p <= 18) return 'S';
    if (p <= 30) return 'A+';
    if (p <= 45) return 'A';
    if (p <= 63) return 'B+';
    if (p <= 84) return 'B';
    return 'C';
}
