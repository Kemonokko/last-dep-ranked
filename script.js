import { getRankByPercentile } from './logic.js';

const db = window.db;
let currentUser = null;
window.allPlayers = [];

const RANK_HIERARCHY = ['C', 'B', 'B-plus', 'A', 'A-plus', 'S', 'S-plus', 'Дракон'];

window.loginWithGoogle = async function() {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    try {
        const result = await window.firebase.auth().signInWithPopup(provider);
        const userEmail = result.user.email;

        const querySnapshot = await db.collection("profiles").where("email", "==", userEmail).get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            currentUser = userDoc.data();

            localStorage.setItem('tw_username', currentUser.username);

            const authBlock = document.getElementById('auth-forms');
            if (authBlock) authBlock.style.display = 'none';

            renderMyProfile();
        } else {
            await window.firebase.auth().signOut();
            alert("Доступ запрещен! Вашей почты нет в списке участников.");
        }
    } catch (error) {
        console.error("Ошибка Google Auth:", error);
        alert("Не удалось войти через Google: " + error.message);
    }
};

window.logoutFromLeague = async function() {
    try {
        await window.firebase.auth().signOut();
        currentUser = null;
        localStorage.removeItem('tw_username');
        
        const authBlock = document.getElementById('auth-forms');
        if (authBlock) authBlock.style.display = 'flex';
        
        const container = document.getElementById('profile-container');
        if (container) container.innerHTML = '<p style="text-align:center; color:#a8a8b3; margin-top:30px;">Войдите через Google для доступа к профилю.</p>';
        
        alert('Вы успешно вышли из профиля.');
    } catch (error) {
        console.error("Ошибка при выходе:", error);
    }
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const btnIndex = tabName === 'rating' ? 0 : tabName === 'history' ? 1 : 2;
    document.querySelectorAll('.nav-btn')[btnIndex].classList.add('active');

    if (tabName === 'history') {
        if (typeof window.loadHistory === 'function') {
            window.loadHistory();
        }
    }
};


function renderMyProfile() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    const foundInGlobal = window.allPlayers ? window.allPlayers.find(p => p.username === currentUser.username) : null;
    const currentRank = foundInGlobal ? foundInGlobal.currentRank : (currentUser.currentRank || 'C');
    const currentRankClass = currentRank.replace('+', '-plus');

    const userRole = currentUser.role || 'player';
    const hasAdminAccess = userRole === 'founder' || userRole === 'admin';

    let roleBadge = '';
    let nameClass = 'role-player';

    if (userRole === 'founder') { roleBadge = '<span style="color:#a855f7; font-size:0.9rem; display:block; margin-top:5px;">[Founder]</span>'; nameClass = 'role-founder'; }
    else if (userRole === 'admin') { roleBadge = '<span style="color:#06b6d4; font-size:0.9rem; display:block; margin-top:5px;">[Admin]</span>'; nameClass = 'role-admin'; }
    else if (userRole === 'bloodline') { roleBadge = '<span style="color:#ef4444; font-size:0.9rem; display:block; margin-top:5px;">[Bloodline]</span>'; nameClass = 'role-bloodline'; }

    let adminPanelHtml = '';
    if (hasAdminAccess) {
        adminPanelHtml = `
            <hr style="border-color:#29292e; margin:20px 0;">
            <h3>Панель администратора</h3>
            
            <div style="margin-top:10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
                <h4>1. Добавить нового игрока</h4>
                <input type="text" id="new-player-username" placeholder="Никнейм (Обязательно)">
                <input type="number" id="new-player-elo" placeholder="Стартовое Эло" value="1500">
                <input type="text" id="new-player-email" placeholder="Email Google (Только для админов)">
                <select id="new-player-role" style="width:100%; padding:10px; margin:10px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
                 <label style="display:block; margin-top:10px; color:#8f9bb3; font-size:0.9rem;">Цвет фракции (Tactile Wars):</label>
<select id="new-player-color" style="width:100%; padding:10px; margin:5px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
    <option value="cyan" style="color:#06b6d4;">Бирюзовый (Cyan)</option>
    <option value="purple" style="color:#a855f7;">Фиолетовый (Purple)</option>
    <option value="pink" style="color:#ec4899;">Розовый (Pink)</option>
    <option value="green" style="color:#22c55e;">Зеленый (Green)</option>
    <option value="red" style="color:#ef4444;">Красный (Red)</option>
    <option value="yellow" style="color:#eab308;">Желтый (Yellow)</option>
</select>
                    <option value="player">Роль: Player</option>
                    <option value="bloodline">Роль: Bloodline</option>
                    <option value="admin">Роль: Admin</option>
                    <option value="founder">Роль: Founder</option>
                </select>
                <button onclick="window.createNewPlayerByAdmin()" style="background:#3498db !important; color:#fff !important; width:100%; margin-top:5px;">Создать игрока</button>
            </div>

            <div style="margin-top:20px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
                <h4>2. Внести результат матча</h4>

                <select id="match-winner" style="width:100%; padding:10px; margin:5px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
                <option value="">-- Выберите победителя --</option>
                ${(window.allPlayers || []).map(p => `<option value="${p.username}">${p.username} (${p.elo} ELO)</option>`).join('')}
                </select>

                <select id="match-loser" style="width:100%; padding:10px; margin:5px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
                <option value="">-- Выберите проигравшего --</option>
                ${(window.allPlayers || []).map(p => `<option value="${p.username}">${p.username} (${p.elo} ELO)</option>`).join('')}
                </select>

                <input type="hidden" id="match-score" value="1/0">
                <p style="font-size: 0.85rem; color: #888; margin: 10px 0; text-align: center;">Формат матча: До 1 победы (K-фактор: 40)</p>

                <button id="btn-submit-match" style="background:#04d361 !important; color:#000 !important; width:100%;">Внести матч</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="profile-card" style="text-align:center;">
            <div class="profile-info-block">
                <h2 class="${nameClass}">${currentUser.username}</h2>
                <div>${roleBadge}</div>
                
                <p style="margin-top:20px;">Текущее Эло: <strong style="color: #ffd700 !important; text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);">${currentUser.elo}</strong></p>
                <p style="margin-bottom: 25px;">Текущий ранг: <strong class="rank-${currentRankClass}">${currentRank}</strong></p>
                
                <button onclick="window.logoutFromLeague()" style="background: #29292e !important; color: #ff5252 !important; border: 1px solid #ff5252; margin-top: 15px; width: 100%;">Выйти из аккаунта</button>
                ${adminPanelHtml}
            </div>
        </div>
    `;
}

function calculateDynamicRanks(players) {
    players.sort((a, b) => b.elo - a.elo);
    const total = players.length;

    return players.map((player, index) => {
        const position = index + 1;
        const rank = getRankByPercentile(position, total);
        
        player.currentRank = rank;

        const currentRankIndex = RANK_HIERARCHY.indexOf(rank);
        const maxRankIndex = RANK_HIERARCHY.indexOf(player.maxRank || 'C');
        
        if (currentRankIndex > maxRankIndex) {
            player.maxRank = rank;
            db.collection("profiles").doc(player.username).update({ maxRank: rank });
        }

        return player;
    });
}

async function loadRating() {
    try {
        const querySnapshot = await db.collection("profiles").get();
        let rawPlayers = [];
        querySnapshot.forEach(doc => rawPlayers.push(doc.data()));

        if (rawPlayers.length === 0) return;

        window.allPlayers = calculateDynamicRanks(rawPlayers);
        displayRating(window.allPlayers);
        
        if (currentUser) {
            const freshData = window.allPlayers.find(p => p.username === currentUser.username);
            if (freshData) currentUser = freshData;
            renderMyProfile();
        }
    } catch (error) {
        console.error("Ошибка загрузки рейтинга:", error);
    }
}

function displayRating(playersList) {
    const tbody = document.getElementById('rating-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    playersList.forEach((player, index) => {
        const tr = document.createElement('tr');
        const rankText = player.currentRank || 'C';
        const rankClass = rankText.replace('+', '-plus');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="clickable-name" onclick="window.openPlayerModal('${player.username}')">${player.username}</td>
            <td>${player.elo}</td>
            <td class="rank-${rankClass}" style="font-weight: bold;">${rankText}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterRating = function() {
    const val = document.getElementById('search-rating').value.toLowerCase();
    if (!window.allPlayers) return;
    const filtered = window.allPlayers.filter(p => p.username.toLowerCase().includes(val));
    displayRating(filtered);
};

window.closeModal = function(e) {
    if (e.target.id === 'player-modal') {
        document.getElementById('player-modal').style.display = 'none';
    }
};

window.addEventListener('DOMContentLoaded', () => {
    window.firebase.auth().onAuthStateChanged(async (user) => {
        if (user && user.email) {
            const querySnapshot = await db.collection("profiles").where("email", "==", user.email).get();
            if (!querySnapshot.empty) {
                currentUser = querySnapshot.docs[0].data();
                                const authBlock = document.getElementById('auth-forms');
                if (authBlock) authBlock.style.display = 'none';
                
                if (window.allPlayers.length === 0) {
                    await loadRating();
                } else {
                    renderMyProfile();
                }
            } else {
                loadRating();
            }
        } else {
            loadRating();
        }
    });
});
