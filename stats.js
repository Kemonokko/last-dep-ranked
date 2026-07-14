import { getRankByPercentile, getArmyHexColor } from './logic.js';

const db = window.db;

function formatMatchDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const year = String(date.getFullYear()).slice(-2); 
    
    return `${day}.${month}.${year}`;
}

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

    const userRole = window.currentUserRole || 'player'; 
    const isAdmin = (userRole === 'admin' || userRole === 'founder');

    matchesList.forEach((m, index) => {
        const div = document.createElement('div');
        div.style.padding = "2px 0"; 
        
        const matchDate = formatMatchDate(m.created_at);

        const winnerData = (window.allPlayers || []).find(p => p.username === m.winner_username);
        const loserData = (window.allPlayers || []).find(p => p.username === m.loser_username);
        const winnerColor = getArmyHexColor(winnerData ? winnerData.army_color : 'white');
        const loserColor = getArmyHexColor(loserData ? loserData.army_color : 'white');
        
        const currentUserData = window.currentUser || null;
        const isAdmin = currentUserData && (currentUserData.role === 'admin' || currentUserData.role === 'founder');
        
        div.innerHTML = `
            <div class="match-card" 
                style="
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    padding: 18px 16px; 
                    margin-top: 10px; 
                    background: rgba(20, 20, 22, 0.85); 
                    backdrop-filter: blur(8px);       
                    -webkit-backdrop-filter: blur(8px);
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.05); 
                    cursor: ${isAdmin ? 'pointer' : 'default'};
                    user-select: none;
                "
                title="${isAdmin ? 'Двойной клик, чтобы удалить матч и откатить Эло' : ''}"
            >
                <!-- Стиль-хак: на телефонах перестраиваем карточку в вертикальный режим -->
                <style>
                    @media (max-width: 600px) {
                        .match-card {
                            flex-direction: column !important;
                            gap: 8px !important;
                            align-items: center !important;
                        }
                        .match-winner-row { width: 100% !important; justify-content: flex-start !important; }
                        .match-date-row { width: 100% !important; text-align: center !important; }
                        .match-loser-row { width: 100% !important; justify-content: flex-end !important; }
                    }
                </style>

                <!-- 1 СТРОКА: Победитель -->
                <div class="match-winner-row" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; width: 42%;">
                    <span style="
                        display: inline-block;
                        width: 0;
                        height: 0;
                        border-left: 5px solid transparent;
                        border-right: 5px solid transparent;
                        border-bottom: 8px solid #04d361;
                        flex-shrink: 0;
                    "></span>
                    <span class="clickable-name" onclick="event.stopPropagation(); openPlayerModal('${m.winner_username}')" style="font-weight: 600; color: ${mWinnerColor} !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
                        ${m.winner_username}
                    </span>
                    <span style="color: #04d361; font-size: 0.8rem; font-weight: bold; flex-shrink: 0;">+${m.elo_change || 20}</span>
                </div>

                <!-- 2 СТРОКА: Дата -->
                <div class="match-date-row" style="color: #ffffff; font-size: 0.75rem; font-weight: bold; text-align: center; width: 16%; letter-spacing: 0.5px;">
                    ${matchDate || 'МАТЧ'}
                </div>

                <!-- 3 СТРОКА: Проигравший -->
                <div class="match-loser-row" style="display: flex; align-items: center; gap: 8px; justify-content: flex-end; width: 42%;">
                    <span style="color: #e74c3c; font-size: 0.8rem; font-weight: bold; flex-shrink: 0;">-${m.elo_change || 20}</span>
                    <span class="clickable-name" onclick="event.stopPropagation(); openPlayerModal('${m.loser_username}')" style="font-weight: 500; color: color: ${mLoserColor} !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; cursor: pointer;">
                        ${m.loser_username}
                    </span>
                    <span style="
                        display: inline-block;
                        width: 0;
                        height: 0;
                        border-left: 5px solid transparent;
                        border-right: 5px solid transparent;
                        border-top: 8px solid #e74c3c;
                        flex-shrink: 0;
                    "></span>
                </div>
            </div>
        `;

        if (isAdmin) {
            const cardElement = div.querySelector('.match-card');
            cardElement.addEventListener('dblclick', () => {
                if (typeof window.deleteAndUndoMatch === 'function') {
                    window.deleteAndUndoMatch(m); 
                }
            });
        }

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
        
        lastThree.forEach((m, index) => {
            const changeAmount = m.elo_change || 20; 
            const matchDate = formatMatchDate(m.created_at);

            matchesHtml += `
                <div class="modal-match-card-${index}" 
                    style="
                        display: flex; 
                        align-items: center; 
                        justify-content: space-between; 
                        padding: 14px 14px; 
                        margin-top: 8px; 
                        background: rgba(20, 20, 22, 0.85); 
                        backdrop-filter: blur(8px);       
                        -webkit-backdrop-filter: blur(8px);
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.05); 
                    "
                >
                    <style>
                        @media (max-width: 600px) {
                            .modal-match-card-${index} {
                                flex-direction: column !important;
                                gap: 8px !important;
                                align-items: center !important;
                            }
                            .m-winner-row-${index} { width: 100% !important; justify-content: flex-start !important; }
                            .m-date-row-${index} { width: 100% !important; text-align: center !important; }
                            .m-loser-row-${index} { width: 100% !important; justify-content: flex-end !important; }
                        }
                    </style>

                    <!-- Победитель в модалке -->
                    <div class="m-winner-row-${index}" style="display: flex; align-items: center; gap: 6px; width: 42%; justify-content: flex-start;">
                        <span style="
                            display: inline-block;
                            width: 0;
                            height: 0;
                            border-left: 5px solid transparent;
                            border-right: 5px solid transparent;
                            border-bottom: 8px solid #04d361;
                            flex-shrink: 0;
                        "></span>
                        <span class="clickable-name" onclick="openPlayerModal('${m.winner_username}')" style="font-weight: 600; color: ${mWinnerColor} !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${m.winner_username}
                        </span>
                        <span style="color: #04d361; font-size: 0.8rem; font-weight: bold; flex-shrink: 0;">+${changeAmount}</span>
                    </div>

                    <!-- Дата в модалке по центру -->
                    <div class="m-date-row-${index}" style="color: #ffffff; font-size: 0.75rem; font-weight: bold; width: 16%; text-align: center; letter-spacing: 0.5px;">
                        ${matchDate || 'МАТЧ'}
                    </div>

                    <!-- Проигравший в модалке -->
                    <div class="m-loser-row-${index}" style="display: flex; align-items: center; gap: 6px; width: 42%; justify-content: flex-end;">
                        <span style="color: #e74c3c; font-size: 0.8rem; font-weight: bold; flex-shrink: 0;">-${changeAmount}</span>
                        <span class="clickable-name" onclick="openPlayerModal('${m.loser_username}')" style="font-weight: 600; color: ${mLoserColor} !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">
                            ${m.loser_username}
                        </span>
                        <span style="
                            display: inline-block;
                            width: 0;
                            height: 0;
                            border-left: 5px solid transparent;
                            border-right: 5px solid transparent;
                            border-top: 8px solid #e74c3c;
                            flex-shrink: 0;
                        "></span>
                    </div>
                </div>
            `;
        });

        const playerRole = player.role || 'player';
        let roleBadge = '';
        let nameClass = 'role-player';

        if (playerRole === 'founder') {
            roleBadge = '<div style="color:#a855f7; font-size:0.85rem; font-weight:600; margin-top:4px; letter-spacing:0.5px;">Founder</div>';
        } else if (playerRole === 'admin') {
            roleBadge = '<div style="color:#06b6d4; font-size:0.85rem; font-weight:600; margin-top:4px; letter-spacing:0.5px;">Admin</div>';
        } else if (playerRole === 'bloodline') {
            roleBadge = '<div style="color:#ef4444; font-size:0.85rem; font-weight:600; margin-top:4px; letter-spacing:0.5px;">Bloodline</div>';
        }

        modalData.innerHTML = `
            <div style="text-align:center; margin-bottom:15px;">
                <h3 class="${nameClass}" style="margin-top:10px; margin-bottom:0; color: ${mainPlayerColor}; font-size: 1.5rem; letter-spacing: 0.5px;">
                    ${player.username}
                </h3>
                ${roleBadge}
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
