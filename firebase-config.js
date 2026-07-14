const firebaseConfig = {
    apiKey: "AIzaSyA-NOn73fJkwk8mEFjKP1BT0gMTKKXl_4",
    authDomain: "://firebaseapp.com",
    projectId: "tactile-wars",
    storageBucket: "://appspot.com",
    messagingSenderId: "352492746252",
    appId: "1:352492746252:web:ab76c2d154ffd2a47dd029",
    measurementId: "G-CV4B3MCV9P"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
