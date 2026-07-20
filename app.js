import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔑 GOOGLE DRIVE API KEY
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

// =======================
// 🔐 LOGIN
// =======================
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login gagal: " + err.message);
  }
};

// =======================
// 🚪 LOGOUT
// =======================
document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
};

// =======================
// 🔄 AUTH STATE
// =======================
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

// =======================
// 📂 NAVIGATION
// =======================
let historyStack = [];

// tombol folder utama
document.querySelectorAll("#folders button").forEach(btn => {
  btn.onclick = () => loadFolder(btn.dataset.id);
});

// tombol back
document.getElementById("backBtn").onclick = () => {
  historyStack.pop();
  const prev = historyStack.pop();
  if (prev) loadFolder(prev);
};

// =======================
// 📂 LOAD FOLDER
// =======================
async function loadFolder(folderId) {
  historyStack.push(folderId);

  document.getElementById("backBtn").style.display =
    historyStack.length > 1 ? "block" : "none";

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${API_KEY}`
    );

    const data = await res.json();
    const grid = document.getElementById("fileGrid");
    grid.innerHTML = "";

    if (!data.files) {
      grid.innerHTML = "<p>Gagal load file</p>";
      return;
    }

    data.files.forEach(file => {
      const div = document.createElement("div");
      div.className = "file";

      const isFolder =
        file.mimeType === "application/vnd.google-apps.folder";

      div.innerHTML = `
        <img src="${
          isFolder
            ? "https://cdn-icons-png.flaticon.com/512/716/716784.png"
            : `https://drive.google.com/thumbnail?id=${file.id}`
        }" width="100%">
        <p>${file.name}</p>
      `;

      div.onclick = () => {
        if (isFolder) {
          loadFolder(file.id);
        } else {
          openViewer(file.id);
        }
      };

      grid.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    alert("Error ambil data");
  }
}

// =======================
// 📄 VIEWER
// =======================
function openViewer(fileId) {
  document.getElementById("viewer").style.display = "block";

  document.getElementById("viewerFrame").src =
    `https://drive.google.com/file/d/${fileId}/preview`;
}

// tombol close viewer
document.getElementById("closeViewer").onclick = () => {
  document.getElementById("viewer").style.display = "none";
  document.getElementById("viewerFrame").src = "";
};
