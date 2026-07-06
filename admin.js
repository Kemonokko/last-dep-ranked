window.createNewPlayerByAdmin = async function() {
    const username = document.getElementById('new-player-username').value.trim();
    if (!username) return alert('Введите никнейм игрока!');

    const userDocRef = doc(db, "profiles", username);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        return alert('Такой игрок уже есть в базе данных!');
    }

    await setDoc(userDocRef, {
        username: username,
        avatar_url: 'https://placehold.co',
        bio: '...',
        elo: 1500,
        rounds_won: 0,
        rounds_lost: 0,
        maxRank: 'C',
        last_bonus_win: false
    });

    alert(`Игрок ${username} успешно добавлен в базу!`);
    document.getElementById('new-player-username').value = '';
    loadRating();
}

window.addMatchResult = async function() {
    const winner = document.getElementById('match-winner').value.trim();
    const loser = document.getElementById('match-loser').value.trim();
    const score = document.getElementById('match-score').value;

    if (!winner || !loser) return alert('Заполните ники!');
    if (winner === loser) return alert('Игрок не может играть сам с собой!');

    const winnerRef = doc(db, "profiles", winner);
    const loserRef = doc(db, "profiles", loser);
    const winnerSnap = await getDoc(winnerRef);
    const loserSnap = await getDoc(loserRef);

    if (!winnerSnap.exists() || !loserSnap.exists()) {
        return alert('Один из игроков не найден в базе данных! Сначала добавьте его через верхнее поле.');
    }

    const winnerData = winnerSnap.data();
    const loserData = loserSnap.data();

    let eloChange = 10; let wRounds = 4; let lRounds = 0;

    if (score === "4/0") { eloChange = 40; wRounds = 4; lRounds = 0; }
    else if (score === "4/1") { eloChange = 30; wRounds = 4; lRounds = 1; }
    else if (score === "4/2") { eloChange = 20; wRounds = 4; lRounds = 2; }
    else if (score === "4/3") { eloChange = 10; wRounds = 4; lRounds = 3; }

    await updateDoc(winnerRef, {
        elo: (winnerData.elo || 1000) + eloChange,
        rounds_won: (winnerData.rounds_won || 0) + wRounds,
        rounds_lost: (winnerData.rounds_lost || 0) + lRounds,
        last_bonus_win: true
    });

    let newLoserElo = (loserData.elo || 1000) - eloChange;
    if (newLoserElo < 0) newLoserElo = 0;

    await updateDoc(loserRef, {
        elo: newLoserElo,
        rounds_won: (loserData.rounds_won || 0) + lRounds,
        rounds_lost: (loserData.rounds_lost || 0) + wRounds
    });

    await addDoc(collection(db, "matches"), {
        winner_username: winner,
        loser_username: loser,
        score: score,
        elo_change: eloChange,
        created_at: new Date()
    });

    alert('Матч внесен!');
    document.getElementById('match-winner').value = '';
    document.getElementById('match-loser').value = '';
    loadRating();
}
