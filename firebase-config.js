if (!window.db && window.firebase) {
    window.db = window.firebase.firestore();
}
