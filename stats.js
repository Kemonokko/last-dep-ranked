import { getRankByPercentile } from './logic.js';

const db = window.db;

window.loadHistory = async function() {
    try {
        const querySnapshot = await db.collection("matches").orderBy("created_at", "desc").get();
        window.allMatches = [];
        querySnapshot.forEach(doc => window.allMatches.push(doc.data()));
        window.displayHistory(window.allMatches);
    } catch (error) {
        console.error("Ошибка загрузки истории:", error);
    }
}

window.displayHistory = function(matchesList) {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';

    if (!matchesList || matchesList.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px; font-style:italic;">Матчей ещё не было зафиксировано</p>';
        return;
    }

    matchesList.forEach(m => {
        const div = document.createElement('div');
        div.style.padding = "2px 0"; 
        
        div.innerHTML = `
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                padding: 10px 14px; 
                margin-top: 8px; 
                background: rgba(32, 32, 36, 0.6); 
                backdrop-filter: blur(8px);       
                -webkit-backdrop-filter: blur(8px);
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.05);
            ">
                <div style="display: flex; align-items: center; gap: 8px; width: 42%; justify-content: flex-start;">
                    <span style="
                        display: inline-block;
                        width: 0;
                        height: 0;
                        border-left: 5px solid transparent;
                        border-right: 5px solid transparent;
                        border-bottom: 8px solid #04d361;
                    "></span>
                    <span class="clickable-name" onclick="openPlayerModal('${m.winner_username}')" style="font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;">
                        ${m.winner_username}
                    </span>
                    <span style="color: #04d361; font-size: 0.8rem; font-weight: bold;">+${m.elo_change || 20}</span>
                </div>

                <div style="color: #444; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; width: 16%; text-align: center;">vs</div>

                <div style="display: flex; align-items: center; gap: 8px; width: 42%; justify-content: flex-end;">
                    <span style="color: #e74c3c; font-size: 0.8rem; font-weight: bold;">-${m.elo_change || 20}</span>
                    <span class="clickable-name" onclick="openPlayerModal('${m.loser_username}')" style="font-weight: 500; color: #a2a2ae; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; cursor: pointer;">
                        ${m.loser_username}
                    </span>
                    <span style="
                        display: inline-block;
                        width: 0;
                        height: 0;
                        border-left: 5px solid transparent;
                        border-right: 5px solid transparent;
                        border-top: 8px solid #e74c3c;
                    "></span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.filterHistory = function() {
    const val = document.getElementById('search-history').value.toLowerCase();
    if (!window.allMatches) return;
    const filtered = window.allMatches.filter(m => 
        m.winner_username.toLowerCase().includes(val) || 
        m.loser_username.toLowerCase().includes(val)
    );
    window.displayHistory(filtered);
}

window.openPlayerModal = async function(username) {
    const modal = document.getElementById('player-modal');
    const modalData = document.getElementById('modal-user-data');
    if (!modal || !modalData) return;
    
    modal.style.display = 'flex';
    modalData.innerHTML = '<p>Загрузка статистики...</p>';

    try {
        const playerDoc = await db.collection("profiles").doc(username).get();
        if (!playerDoc.exists) {
            modalData.innerHTML = '<p>Игрок не найден в базе.</p>';
            return;
        }
        const player = playerDoc.data();

        const totalRounds = (player.rounds_won || 0) + (player.rounds_lost || 0);
        const winRate = totalRounds > 0 ? ((player.rounds_won / totalRounds) * 100).toFixed(1) : 0;

        let playerMatches = [];
        if (window.allMatches && window.allMatches.length > 0) {
            playerMatches = window.allMatches.filter(m => m.winner_username === username || m.loser_username === username);
        } else {
            const snapshot = await db.collection("matches").orderBy("created_at", "desc").get();
            snapshot.forEach(d => {
                const m = d.data();
                if(m.winner_username === username || m.loser_username === username) {
                    playerMatches.push(m);
                }
            });
        }
        let lastThree = playerMatches.slice(0, 3);

        let totalPlayersCount = 1;
        if (window.allPlayers && window.allPlayers.length > 0) {
            totalPlayersCount = window.allPlayers.length;
        } else {
            const allPlayersSnapshot = await db.collection("profiles").get();
            totalPlayersCount = allPlayersSnapshot.size || 1;
        }

        let playerPosition = 1;
        if (window.allPlayers && window.allPlayers.length > 0) {
            const index = window.allPlayers.findIndex(p => p.username === username);
            if (index !== -1) playerPosition = index + 1;
        } else {
            const higherEloSnapshot = await db.collection("profiles").where("elo", ">", player.elo || 1500).get();
            playerPosition = higherEloSnapshot.size + 1;
        }

        const currentRank = getRankByPercentile(playerPosition, totalPlayersCount);
        const currentRankClass = currentRank.replace('+', '-plus');

        let matchesHtml = '<h4 style="margin-bottom: 12px; color: #8f9bb3;">Последние 3 боя:</h4>';
        if (lastThree.length === 0) {
            matchesHtml += '<p style="color: #666; font-style: italic;">Матчей ещё не было</p>';
        }
        
        lastThree.forEach(m => {
            const changeAmount = m.elo_change || 20; 

            matchesHtml += `
                <div style="
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    padding: 8px 12px; 
                    margin-top: 6px; 
                    background: #19191c; 
                    border-radius: 6px;
                    border: 1px solid #222226;
                ">
                    <div style="display: flex; align-items: center; gap: 6px; width: 42%; justify-content: flex-start;">
                        <span style="
                            display: inline-block;
                            width: 0;
                            height: 0;
                            border-left: 5px solid transparent;
                            border-right: 5px solid transparent;
                            border-bottom: 8px solid #04d361;
                        "></span>
                        <span class="clickable-name" onclick="openPlayerModal('${m.winner_username}')" style="font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${m.winner_username}
                        </span>
                        <span style="color: #04d361; font-size: 0.8rem; font-weight: bold;">+${changeAmount}</span>
                    </div>

                    <div style="color: #444; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; width: 16%; text-align: center;">vs</div>

                    <div style="display: flex; align-items: center; gap: 6px; width: 42%; justify-content: flex-end;">
                        <span style="color: #e74c3c; font-size: 0.8rem; font-weight: bold;">-${changeAmount}</span>
                        <span class="clickable-name" onclick="openPlayerModal('${m.loser_username}')" style="font-weight: 500; color: #a2a2ae; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">
                            ${m.loser_username}
                        </span>
                        <span style="
                            display: inline-block;
                            width: 0;
                            height: 0;
                            border-left: 5px solid transparent;
                            border-right: 5px solid transparent;
                            border-top: 8px solid #e74c3c;
                        "></span>
                    </div>
                </div>
            `;
        });
        
        const playerRole = player.role || 'player';
        let roleBadge = '';
        let nameClass = 'role-player';

        if (playerRole === 'founder') {
            roleBadge = ' <span style="color:#a855f7; font-size:0.8rem;">[Founder]</span>';
        } else if (playerRole === 'admin') {
            roleBadge = ' <span style="color:#06b6d4; font-size:0.8rem;">[Admin]</span>';
        } else if (playerRole === 'bloodline') {
            roleBadge = ' <span style="color:#ef4444; font-size:0.8rem;">[Bloodline]</span>';
        }

        modalData.innerHTML = `
            <div style="text-align:center; margin-bottom:15px;">
                <h3 class="${nameClass}" style="margin-top:10px; color: #ffffff !important;">${player.username}${roleBadge}</h3>
            </div>
            <hr style="border-color:#29292e; margin:10px 0;">
            <p>Текущее Эло: <strong style="color: #ffd700 !important; text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);">${player.elo || 1500}</strong></p>
            <p>Текущий ранг: <span class="rank-${currentRankClass}"><strong>${currentRank}</strong></span></p>
            <p>Победа: <span style="color:#04d361">${player.rounds_won || 0}</span> / Поражения: <span style="color:#e74c3c">${player.rounds_lost || 0}</span></p>
            <p>Винрейт: <strong>${winRate}%</strong></p>
            <hr style="border-color:#29292e; margin:10px 0;">
            ${matchesHtml}
        `;
    } catch (error) {
        console.error("Ошибка загрузки профиля в модалке:", error);
        modalData.innerHTML = '<p>Ошибка загрузки данных.</p>';
    }
}
