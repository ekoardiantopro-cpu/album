import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  storageBucket: "album-ff46e.firebasestorage.app",
  messagingSenderId: "112694935492",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive.readonly");

let accessToken = null;

document.getElementById("loginBtn").onclick = async () => {
  const result = await signInWithPopup(auth, provider);
  accessToken = GoogleAuthProvider.credentialFromResult(result).accessToken;
};

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "block";
  } else {
    document.getElementById("loginBtn").style.display = "block";
  }
});

document.querySelectorAll("#folders button").forEach(btn => {
  btn.onclick = () => loadFolder(btn.dataset.id);
});

async function loadFolder(folderId) {
  if (!accessToken) {
    alert("Login dulu!");
    return;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await res.json();
  const grid = document.getElementById("fileGrid");
  grid.innerHTML = "";

  data.files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file";

    div.innerHTML = `
      <img src="https://drive.google.com/thumbnail?id=${file.id}">
      <p>${file.name}</p>
    `;

    grid.appendChild(div);
  });
}
