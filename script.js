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

        const querySnapshot = await window.db.collection("profiles").where("email", "==", userEmail).get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            currentUser = userDoc.data();
            
            localStorage.setItem('tw_username', currentUser.username);
            
            const authBlock = document.getElementById('auth-forms');
            if (authBlock) authBlock.style.display = 'none';
            
            renderMyProfile();
        } else {
            await window.firebase.auth().signOut();
            alert(`Доступ запрещен.`);
        }
    } catch (error) {
        console.error("Ошибка Google Auth:", error);
        alert("Не удалось войти через Google: " + error.message);
    }
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const btnIndex = tabName === 'rating' ? 0 : tabName === 'history' ? 1 : 2;
    document.querySelectorAll('.nav-btn')[btnIndex].classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'rating') loadRating();
    if (tabName === 'history' && window.loadHistory) window.loadHistory();
}

window.registerWithEmail = async function() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!username || !email || !password) return alert('Заполните все поля для регистрации!');
    if (password.length < 6) return alert('Пароль должен быть не менее 6 символов!');

    try {
        const userDocRef = db.collection("profiles").doc(username);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) return alert('Этот никнейм уже занят другим игроком!');

        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        currentUser = {
            username: username,
            avatar_url: 'https://placehold.co',
            bio: '...',
            elo: 1500,
            rounds_won: 0,
            rounds_lost: 0,
            maxRank: 'C',
            currentRank: 'C',
            role: 'player'
        };
        
        await userDocRef.set(currentUser);
        
        await userCredential.user.updateProfile({ displayName: username });

        localStorage.setItem('tw_username', username);
        alert(`Игрок ${username} успешно зарегистрирован!`);
        
        document.getElementById('auth-forms').style.display = 'none';
        renderMyProfile();
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        alert("Ошибка при регистрации: " + error.message);
    }
}

window.loginWithEmail = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!email || !password) return alert('Заполните Email и Пароль для входа!');

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const username = userCredential.user.displayName;

        if (!username) {
            return alert('К этой почте не привязан игровой никнейм!');
        }

        const userDoc = await db.collection("profiles").doc(username).get();
        
        if (userDoc.exists) {
            currentUser = userDoc.data();
            localStorage.setItem('tw_username', username);
            
            const authBlock = document.getElementById('auth-forms');
            if (authBlock) authBlock.style.display = 'none';
            
            renderMyProfile();
        } else {
            alert('Профиль игрока не найден в базе данных!');
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
        alert("Неверный Email или Пароль!");
    }
}

function renderMyProfile() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    const foundInGlobal = window.allPlayers ? window.allPlayers.find(p => p.username === currentUser.username) : null;
    const currentRank = foundInGlobal ? foundInGlobal.currentRank : (currentUser.currentRank || 'C');

    const currentRankClass = currentRank.replace('+', '-plus');

    const userRole = currentUser.role || 'player'; 
    const hasAdminAccess = userRole === 'founder' || userRole === 'admin';

    let roleBadge = '';
    let nameClass = `rank-${currentRankClass}`;

    if (userRole === 'founder') {
        roleBadge = '<span style="color:#a855f7; font-size:0.9rem; block; margin-top:5px;">Founder</span>';
        nameClass = 'role-founder';
    } else if (userRole === 'admin') {
        roleBadge = '<span style="color:#06b6d4; font-size:0.9rem; block; margin-top:5px;">Admin</span>';
        nameClass = 'role-admin';
    } else if (userRole === 'bloodline') {
        roleBadge = '<span style="color:#ef4444; font-size:0.9rem; block; margin-top:5px;">Bloodline</span>';
        nameClass = 'role-bloodline';
    }

    let adminPanelHtml = '';
    if (hasAdminAccess) {
        adminPanelHtml = `
            <hr style="border-color:#29292e; margin:20px 0;">
            <h3>Панель администратора</h3>

            <div style="margin-top:10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
                <h4>Внести результат матча</h4>
                <input type="text" id="match-winner" placeholder="Ник победителя">
                <input type="text" id="match-loser" placeholder="Ник проигравшего">
                <select id="match-score" style="width:100%; padding:10px; margin:10px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
                    <option value="4/0">Победа 4/0 (±40)</option>
                    <option value="4/1">Победа 4/1 (±30)</option>
                    <option value="4/2">Победа 4/2 (±20)</option>
                    <option value="4/3">Победа 4/3 (±10)</option>
                </select>
                <button onclick="window.addMatchResult()" style="background:#04d361; color:#000; width:100%;">Внести матч</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-info-block">
                <img src="${currentUser.avatar_url || 'https://placehold.co'}" id="my-avatar" style="width:100px; border-radius:50%;">
                <h2 class="${nameClass}">${currentUser.username}</h2>
                ${roleBadge}
                
                <p style="margin-top:10px;">Текущее Эло: <strong style="color: #ffd700 !important; text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);">${currentUser.elo}</strong></p>
                
                <p>Текущий ранг: <strong class="rank-${currentRankClass}">${currentRank}</strong></p>
                
                <input type="text" id="edit-avatar-url" value="${currentUser.avatar_url || ''}" placeholder="Ссылка на аватарку">
                <textarea id="edit-bio" placeholder="О себе">${currentUser.bio || ''}</textarea>
                <button onclick="saveProfileChanges()">Сохранить профиль</button>
                ${adminPanelHtml}
            </div>
        </div>
    `;
}

window.saveProfileChanges = async function() {
    if (!currentUser) return;
    const newAva = document.getElementById('edit-avatar-url').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();

    const userDocRef = db.collection("profiles").doc(currentUser.username);
    await userDocRef.update({ avatar_url: newAva, bio: newBio });
    
    currentUser.avatar_url = newAva;
    currentUser.bio = newBio;
    alert('Профиль сохранен!');
    renderMyProfile();
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
        
        if(rawPlayers.length === 0) return;
        
        window.allPlayers = calculateDynamicRanks(rawPlayers);
        displayRating(window.allPlayers);
    } catch (e) {
        console.error("Ошибка загрузки рейтинга:", e);
    }
}

function displayRating(playersList) {
    const tbody = document.getElementById('rating-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    playersList.forEach((player, index) => {
        const tr = document.createElement('tr');
        
        const rankText = player.currentRank || player.maxRank || 'C';
        
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
}

window.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user && user.displayName) {
            const username = user.displayName;
            const userDoc = await db.collection("profiles").doc(username).get();
            if (userDoc.exists) {
                currentUser = userDoc.data();
                const authBlock = document.getElementById('auth-forms');
                if (authBlock) authBlock.style.display = 'none';
                renderMyProfile();
            }
        }
        loadRating();
    });
});
window.closeModal = function(e) {
    if (e.target.id === 'player-modal') {
        document.getElementById('player-modal').style.display = 'none';
    }
}
