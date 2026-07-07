const db = window.db;
const firebase = window.firebase;

window.loginWithGoogle = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const userEmail = result.user.email;

        const querySnapshot = await db.collection("profiles").where("email", "==", userEmail).get();

        if (!querySnapshot.empty) {
            let userDoc = querySnapshot.docs[0];
            window.currentUser = userDoc.data();
            
            localStorage.setItem('tw_username', window.currentUser.username);
            
            const authForms = document.getElementById('auth-forms');
            if (authForms) authForms.style.display = 'none';
            
            if (window.renderMyProfile) window.renderMyProfile();
        } else {
            await firebase.auth().signOut();
            alert(`Доступ запрещен.`);
        }
    } catch (error) {
        console.error("Ошибка авторизации Google:", error);
        alert("Не удалось войти через Google: " + error.message);
    }
}
