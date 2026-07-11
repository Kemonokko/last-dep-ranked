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
};

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

        alert(`Матч успешно зафиксирован! \n${winner}: +${eloChange} ELO \n${loser}: -${eloChange} ELO`);
        
        document.getElementById('match-winner').value = '';
        document.getElementById('match-loser').value = '';

        if (typeof loadRating === 'function') loadRating();
    } catch (error) {
        console.error("Ошибка при внесении матча:", error);
        alert("Не удалось записать матч.");
    }
};
document.addEventListener('click', function(event) {
    if (event.target && event.target.id === 'btn-submit-match') {
        event.preventDefault();
        window.addMatchResult();
    }
});
window.deleteAndUndoMatch = async function(match) {
    const confirmDelete = confirm(`Вы уверены, что хотите УДАЛИТЬ этот матч и ОТКАТИТЬ рейтинг?\n\nПобедитель: ${match.winner_username} (-${match.elo_change})\nПроигравший: ${match.loser_username} (+${match.elo_change})`);
    
    if (!confirmDelete) return;

    try {
        const winnerRef = db.collection("profiles").doc(match.winner_username);
        const loserRef = db.collection("profiles").doc(match.loser_username);

        const [winnerDoc, loserDoc] = await Promise.all([winnerRef.get(), loserRef.get()]);

        if (!winnerDoc.exists || !loserDoc.exists) {
            return alert("Ошибка: Один из игроков этого матча удален из базы данных. Не удалось вернуть Эло.");
        }

        const winnerData = winnerDoc.data();
        const loserData = loserDoc.data();
        const eloChange = match.elo_change || 20;

        const revertedWinnerElo = (winnerData.elo || 1500) - eloChange;
        const revertedLoserElo = (loserData.elo || 1500) + eloChange;

        const newWinnerWonRounds = Math.max(0, (winnerData.rounds_won || 0) - 1);
        const newLoserLostRounds = Math.max(0, (loserData.rounds_lost || 0) - 1);

        await winnerRef.update({
            elo: Math.max(100, revertedWinnerElo),
            rounds_won: newWinnerWonRounds
        });

        await loserRef.update({
            elo: revertedLoserElo,
            rounds_lost: newLoserLostRounds
        });

        const matchQuery = await db.collection("matches")
            .where("winner_username", "==", match.winner_username)
            .where("loser_username", "==", match.loser_username)
            .where("created_at", "==", match.created_at) 
            .get();

        const deletePromises = [];
        matchQuery.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        await Promise.all(deletePromises);

        alert("Матч успешно удален, а рейтинги игроков пересчитаны!");

        if (typeof window.loadHistory === 'function') window.loadHistory();
        if (typeof loadRating === 'function') loadRating();

    } catch (error) {
        console.error("Ошибка при удалении и откате матча:", error);
        alert("Произошла ошибка базы данных. Не удалось корректно удалить матч.");
    }
};
