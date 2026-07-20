import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔑 API KEY GOOGLE DRIVE
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

// =====================
// 🔐 LOGIN
// =====================
window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login gagal: " + err.message);
  }
};

// =====================
// 🚪 LOGOUT
// =====================
document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
};

// =====================
// 🔄 STATE USER
// =====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("logoutBtn").style.display = "block";
  } else {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("app").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
  }
});

// =====================
// 📂 LOAD GOOGLE DRIVE (PUBLIC)
// =====================
window.loadFolder = async (folderId) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${API_KEY}`
    );

    const data = await res.json();

    if (!data.files) {
      alert("Gagal ambil data dari Google Drive");
      return;
    }

    const grid = document.getElementById("fileGrid");
    grid.innerHTML = "";

    data.files.forEach(file => {
      const div = document.createElement("div");
      div.className = "file";

      div.innerHTML = `
        <img src="https://drive.google.com/thumbnail?id=${file.id}" width="100%">
        <p>${file.name}</p>
      `;

      // klik = buka file di tab baru
      div.onclick = () => {
        window.open(`https://drive.google.com/file/d/${file.id}/view`, "_blank");
      };

      grid.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    alert("Error ambil file");
  }
};
