export function getRankByPercentile(position, total) {
    // ВРЕМЕННЫЙ КОСТЫЛЬ
    if (position === 1) {
        return 'Дракон';
    }
    const percentile = (position / total) * 100;

    if (percentile <= 10) return 'S-plus';
    if (percentile <= 20) return 'S';
    if (percentile <= 35) return 'A-plus';
    if (percentile <= 50) return 'A';
    if (percentile <= 70) return 'B-plus';
    if (percentile <= 85) return 'B';
    
    return 'C';
}
