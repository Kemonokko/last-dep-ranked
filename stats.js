import { getRankByPercentile } from './logic.js';
const db = window.firebase.firestore();
const firebase = window.firebase;

async function loadHistory() {
    const q = query(collection(db, "matches"), orderBy("created_at", "desc"));
    const querySnapshot = await getDocs(q);
    allMatches = [];
    querySnapshot.forEach(doc => allMatches.push(doc.data()));
    displayHistory(allMatches);
}

function displayHistory(matchesList) {
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    matchesList.forEach(m => {
        const div = document.createElement('div');
        div.style.padding = "10px";
        div.style.borderBottom = "1px solid #29292e";
        div.innerHTML = `
            <span class="clickable-name" onclick="openPlayerModal('${m.winner_username}')">${m.winner_username}</span> 
            <strong>${m.score}</strong> 
            <span class="clickable-name" onclick="openPlayerModal('${m.loser_username}')">${m.loser_username}</span>
            <span style="color:#04d361; float:right;">+${m.elo_change} Эло</span>
        `;
        container.appendChild(div);
    });
}

window.filterHistory = function() {
    const val = document.getElementById('search-history').value.toLowerCase();
    const filtered = allMatches.filter(m => 
        m.winner_username.toLowerCase().includes(val) || 
        m.loser_username.toLowerCase().includes(val)
    );
    displayHistory(filtered);
}

window.openPlayerModal = async function(username) {
    const modal = document.getElementById('player-modal');
    const modalData = document.getElementById('modal-user-data');
    modal.style.display = 'flex';
    modalData.innerHTML = '<p>Загрузка статистики...</p>';

    const playerDoc = await getDoc(doc(db, "profiles", username));
    if (!playerDoc.exists()) return;
    const player = playerDoc.data();

    const totalRounds = (player.rounds_won || 0) + (player.rounds_lost || 0);
    const winRate = totalRounds > 0 ? ((player.rounds_won / totalRounds) * 100).toFixed(1) : 0;

    const q = query(collection(db, "matches"), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    let playerMatches = [];
    snapshot.forEach(d => {
        const m = d.data();
        if(m.winner_username === username || m.loser_username === username) {
            playerMatches.push(m);
        }
    });
    let lastThree = playerMatches.slice(0, 3);

    const foundInGlobal = allPlayers.find(p => p.username === username);
    const currentRank = foundInGlobal ? foundInGlobal.currentRank : 'C';

    let matchesHtml = '<h4>Последние 3 боя:</h4>';
    if(lastThree.length === 0) matchesHtml += '<p>Матчей ещё не было</p>';
    lastThree.forEach(m => {
        matchesHtml += `
            <div style="font-size:0.9rem; margin-top:5px;">
                <span class="clickable-name" onclick="openPlayerModal('${m.winner_username}')">${m.winner_username}</span> 
                ${m.score} 
                <span class="clickable-name" onclick="openPlayerModal('${m.loser_username}')">${m.loser_username}</span>
            </div>
        `;
    });

    modalData.innerHTML = `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${player.avatar_url}" style="width:80px; height:80px; border-radius:50%; object-fit:cover;">
            <h3 class="rank-${currentRank}" style="margin-top:10px;">${player.username}</h3>
            <p style="font-size:0.9rem; color:#a8a8b3; font-style:italic;">"${player.bio}"</p>
        </div>
        <hr style="border-color:#29292e; margin:10px 0;">
        <p>Текущее Эло: <strong>${player.elo}</strong></p>
        <p>Максимальный ранг: <span class="rank-${player.maxRank || 'C'}"><strong>${player.maxRank || 'C'}</strong></span></p>
        <p>Победные раунды: <span style="color:#04d361">${player.rounds_won || 0}</span> / Проигранные: <span style="color:#e74c3c">${player.rounds_lost || 0}</span></p>
        <p>Винрейт раундов: <strong>${winRate}%</strong></p>
        <hr style="border-color:#29292e; margin:10px 0;">
        ${matchesHtml}
    `;
}
