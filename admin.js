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
            avatar_url: "https://t4.ftcdn.net/jpg/01/06/40/11/360_F_106401195_E59JLT8KmxWYvHsTtQxHGTuKsp9LRwrW.jpg",
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

window.addMatchResult = async function() {
    const winner = document.getElementById('match-winner').value.trim();
    const loser = document.getElementById('match-loser').value.trim();
    const score = document.getElementById('match-score').value; 

    if (!winner || !loser) return alert('Заполните ники победителя и проигравшего!');
    if (winner === loser) return alert('Игрок не может играть сам с собой!');

    try {
        const winnerRef = db.collection("profiles").doc(winner);
        const loserRef = db.collection("profiles").doc(loser);

        const [winnerDoc, loserDoc] = await Promise.all([winnerRef.get(), loserRef.get()]);

        if (!winnerDoc.exists) return alert(`Игрок ${winner} не найден в базе!`);
        if (!loserDoc.exists) return alert(`Игрок ${loser} не найден в базе!`);

        const winnerData = winnerDoc.data();
        const loserData = loserDoc.data();

        const currentWinnerElo = winnerData.elo || 1500;
        const currentLoserElo = loserData.elo || 1500;

        if (!isMatchAllowed(currentWinnerElo, currentLoserElo)) {
            return alert(`Ошибка подбора! Разница в рейтинге игроков превышает 200 очков (у победителя: ${currentWinnerElo}, у проигравшего: ${currentLoserElo}). Такой матч не может быть учтен.`);
        }

        let loseRounds = 0;
        if (score === "4/1") loseRounds = 1;
        else if (score === "4/2") loseRounds = 2;
        else if (score === "4/3") loseRounds = 3;

        const eloResult = calculateElo(currentWinnerElo, currentLoserElo, loseRounds);
        const eloChange = eloResult.change;

        const newWinnerElo = eloResult.newRatingA;
        const newLoserElo = Math.max(100, eloResult.newRatingB);

        await winnerRef.update({
            elo: newWinnerElo,
            rounds_won: (winnerData.rounds_won || 0) + 4,
            rounds_lost: (winnerData.rounds_lost || 0) + loseRounds
        });

        await loserRef.update({
            elo: newLoserElo,
            rounds_won: (loserData.rounds_won || 0) + loseRounds,
            rounds_lost: (loserData.rounds_lost || 0) + 4
        });

        await db.collection("matches").add({
            winner_username: winner,
            loser_username: loser,
            score: score,
            elo_change: eloChange, 
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`Матч успешно зафиксирован! \n${winner}: +${eloChange} ELO (Стал: ${newWinnerElo}) \n${loser}: -${eloChange} ELO (Стал: ${newLoserElo})`);
        
        document.getElementById('match-winner').value = '';
        document.getElementById('match-loser').value = '';

        if (typeof loadRating === 'function') loadRating();
    } catch (error) {
        console.error("Ошибка при внесении матча:", error);
        alert("Не удалось записать матч.");
    }
}
