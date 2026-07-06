import { initializeApp } from "https://gstatic.com";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, addDoc, query, orderBy, limit, where } from "https://gstatic.com";
import { getRankByPercentile } from './logic.js';

const firebaseConfig = {
  apiKey: "AIzaSyA-3WJn73F3kdc8nLFjHPiBTQqKTXXXi_4",
  authDomain: "://firebaseapp.com",
  projectId: "tactile-wars",
  storageBucket: "tactile-wars.firebasestorage.app",
  messagingSenderId: "352492746252",
  appId: "1:352492746252:web:a075c2d85ff5d2e97da029",
  measurementId: "G-CV4B3WCJVP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = null;
let allPlayers = [];
let allMatches = [];

const RANK_HIERARCHY = ['C', 'B', 'B-plus', 'A', 'A-plus', 'S', 'S-plus', 'Дракон'];

window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const btnIndex = tabName === 'rating' ? 0 : tabName === 'history' ? 1 : 2;
    document.querySelectorAll('.nav-btn')[btnIndex].classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'rating') loadRating();
    if (tabName === 'history') loadHistory();
}

window.loginOrCreateProfile = async function() {
    const username = document.getElementById('my-username-input').value.trim();
    if (!username) return alert('Введите никнейм!');

    const userDocRef = doc(db, "profiles", username);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        currentUser = userDoc.data();
    } else {
        currentUser = {
            username: username,
            avatar_url: 'https://placehold.co',
            bio: 'Всем привет!',
            elo: 1000,
            rounds_won: 0,
            rounds_lost: 0,
            maxRank: 'C',
            last_bonus_win: false
        };
        await setDoc(userDocRef, currentUser);
    }
    
    localStorage.setItem('tw_username', username);
    renderMyProfile();
}

function renderMyProfile() {
    const container = document.getElementById('profile-container');
    const isAdmin = currentUser.username === 'Admin_Semen';

    let adminPanelHtml = '';
    if (isAdmin) {
        adminPanelHtml = `
            <hr style="border-color:#29292e; margin:20px 0;">
            <h3>Панель администратора</h3>
            <div style="margin-top:10px;">
                <input type="text" id="match-winner" placeholder="Ник победителя">
                <input type="text" id="match-loser" placeholder="Ник проигравшего">
                <select id="match-score" style="width:100%; padding:10px; margin:10px 0; background:#202024; border:1px solid #29292e; color:#fff; border-radius:4px;">
                    <option value="4/0">Победа 4/0 (±40 Эло)</option>
                    <option value="4/1">Победа 4/1 (±30 Эло)</option>
                    <option value="4/2">Победа 4/2 (±20 Эло)</option>
                    <option value="4/3">Победа 4/3 (±10 Эло)</option>
                </select>
                <button onclick="addMatchResult()" style="background:#04d361; color:#000; width:100%;">Внести матч</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="profile-info-block">
            <img src="${currentUser.avatar_url}" id="my-avatar" style="width:100px; border-radius:50%;">
            <h2 class="rank-${currentUser.currentRank || 'C'}">${currentUser.username} ${isAdmin ? '👑' : ''}</h2>
            <p>Текущее Эло: <strong>${currentUser.elo}</strong></p>
            <p>Максимальный ранг: <strong class="rank-${currentUser.maxRank}">${currentUser.maxRank}</strong></p>
            <input type="text" id="edit-avatar-url" value="${currentUser.avatar_url}" placeholder="Ссылка на аватарку">
            <textarea id="edit-bio" placeholder="О себе">${currentUser.bio}</textarea>
            <button onclick="saveProfileChanges()">Сохранить профиль</button>
            ${adminPanelHtml}
        </div>
    `;
}

window.saveProfileChanges = async function() {
    if (!currentUser) return;
    const newAva = document.getElementById('edit-avatar-url').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();

    const userDocRef = doc(db, "profiles", currentUser.username);
    await updateDoc(userDocRef, { avatar_url: newAva, bio: newBio });
    
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
            updateDoc(doc(db, "profiles", player.username), { maxRank: rank });
        }

        return player;
    });
}

async function loadRating() {
    const querySnapshot = await getDocs(collection(db, "profiles"));
    let rawPlayers = [];
    querySnapshot.forEach(doc => rawPlayers.push(doc.data()));
    
    if(rawPlayers.length === 0) return;
    
    allPlayers = calculateDynamicRanks(rawPlayers);
    displayRating(allPlayers);
}

function displayRating(playersList) {
    const tbody = document.getElementById('rating-list');
    tbody.innerHTML = '';
    
    playersList.forEach((player, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="clickable-name rank-${player.currentRank}" onclick="openPlayerModal('${player.username}')">${player.username}</td>
            <td>${player.elo}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterRating = function() {
    const val = document.getElementById('search-rating').value.toLowerCase();
    const filtered = allPlayers.filter(p => p.username.toLowerCase().includes(val));
    displayRating(filtered);
}

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
