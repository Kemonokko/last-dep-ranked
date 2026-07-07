export function getRankByPercentile(position, total) {
    const pct = {
        'Дракон': 0.03,
        'S+': 0.06,
        'S': 0.09,
        'A+': 0.12,
        'A': 0.15,
        'B+': 0.18,
        'B': 0.21,
        'C': 0.16
    };

    let seats = {};
    for (let r in pct) {
        seats[r] = Math.round(total * pct[r]);
    }

    if (position <= seats['Дракон']) return 'Дракон';
    
    let currentCutoff = seats['Дракон'];
    
    currentCutoff += seats['S+'];
    if (position <= currentCutoff) return 'S+';
    
    currentCutoff += seats['S'];
    if (position <= currentCutoff) return 'S';
    
    currentCutoff += seats['A+'];
    if (position <= currentCutoff) return 'A+';
    
    currentCutoff += seats['A'];
    if (position <= currentCutoff) return 'A';
    
    currentCutoff += seats['B+'];
    if (position <= currentCutoff) return 'B+';
    
    currentCutoff += seats['B'];
    if (position <= currentCutoff) return 'B';

    return 'C';
}
