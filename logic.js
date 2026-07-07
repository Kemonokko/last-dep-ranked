export function getRankByPercentile(position, total) {

    const percentile = (position / total) * 100;

    if (percentile <= 3) return 'Дракон';
    if (percentile <= 9) return 'S+';
    if (percentile <= 18) return 'S';
    if (percentile <= 30) return 'A+';
    if (percentile <= 45) return 'A';
    if (percentile <= 63) return 'B+';
    if (percentile <= 84) return 'B';
    
    return 'C';
}
