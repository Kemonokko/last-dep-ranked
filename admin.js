import { calculateElo, isMatchAllowed } from './logic.js';

const db = window.db;

window.createNewPlayerByAdmin = async function() {
    const username = document.getElementById('new-player-username').value.trim();
    const eloInput = document.getElementById('new-player-elo').value.trim();
    const email = document.getElementById('new-player-email').value.trim();
    const role = document.getElementById('new-player-role').value;

    if (!username) return alert('Введите никнейм игрока!');
    const elo = eloInput ? parseInt(eloInput) : 1500;

    try {
        const userDocRef = db.collection("profiles").doc(username);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) return alert('Игрок с таким ником уже есть в базе!');

        await userDocRef.set({
            username: username,
            elo: elo,
            email: email || "",
            role: role,
            bio: ".....",
            rounds_won: 0,
            rounds_lost: 0,
            currentRank: "C"
        });

        alert(`Игрок ${username} успешно добавлен в лигу!`);
        
        document.getElementById('new-player-username').value = '';
        document.getElementById('new-player-email').value = '';
        
        if (typeof loadRating === 'function') loadRating();
    } catch (error) {
        console.error("Ошибка при создании игрока:", error);
        alert("Не удалось создать игрока: " + error.message);
    }
}

const winnerData = winnerDoc.data();
        const loserData = loserDoc.data();

        const currentWinnerElo = winnerData.elo || 1500;
        const currentLoserElo = loserData.elo || 1500;

        if (!isMatchAllowed(currentWinnerElo, currentLoserElo)) {
            return alert(`Ошибка подбора! Разница в рейтинге игроков превышает 200 очков.`);
        }

        const eloResult = calculateElo(currentWinnerElo, currentLoserElo);
        const eloChange = eloResult.change;

        const newWinnerElo = eloResult.newRatingA;
        const newLoserElo = Math.max(100, eloResult.newRatingB);

        await winnerRef.update({
            elo: newWinnerElo,
            rounds_won: (winnerData.rounds_won || 0) + 1,
            rounds_lost: (winnerData.rounds_lost || 0) + 0
        });

        await loserRef.update({
            elo: newLoserElo,
            rounds_won: (loserData.rounds_won || 0) + 0,
            rounds_lost: (loserData.rounds_lost || 0) + 1
        });

        await db.collection("matches").add({
            winner_username: winner,
            loser_username: loser,
            score: "1/0", 
            elo_change: eloChange,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
