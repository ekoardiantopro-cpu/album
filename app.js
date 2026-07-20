import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// =======================
// 🔥 FIREBASE CONFIG
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =======================
// 🔑 GOOGLE DRIVE API
// =======================
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

// =======================
// 🎯 DOM ELEMENT
// =======================
const loginBox = document.getElementById("loginBox");
const appContainer = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
const fileGrid = document.getElementById("fileGrid");
const viewer = document.getElementById("viewer");
const viewerFrame = document.getElementById("viewerFrame");
const backBtn = document.getElementById("backBtn");
const searchInput = document.getElementById("searchInput");

// INPUT FIX (INI YANG TADI ERROR)
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

let historyStack = [];
let currentFiles = [];

// =======================
// 🔐 LOGIN (FIX TOTAL)
// =======================
document.getElementById("loginBtn").onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email & password wajib diisi!");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
};

// =======================
// 🚪 LOGOUT
// =======================
logoutBtn.onclick = () => signOut(auth);

// =======================
// 🔄 AUTH STATE
// =======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBox.style.display = "none";
    appContainer.style.display = "block";
    logoutBtn.style.display = "block";
  } else {
    loginBox.style.display = "block";
    appContainer.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

// =======================
// 📂 BUTTON FOLDER
// =======================
document.querySelectorAll("#folders button").forEach(btn => {
  btn.onclick = () => loadFolder(btn.dataset.id);
});

// =======================
// 🔙 BACK
// =======================
backBtn.onclick = goBack;

// =======================
// 🔍 SEARCH
// =======================
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase();

  const filtered = currentFiles.filter(file =>
    file.name.toLowerCase().includes(keyword)
  );

  renderFiles(filtered);
});

// =======================
// 📂 LOAD FOLDER
// =======================
async function loadFolder(folderId) {
  historyStack.push(folderId);

  backBtn.style.display =
    historyStack.length > 1 ? "block" : "none";

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents and trashed=false&fields=files(id,name,mimeType)&key=${API_KEY}`
    );

    const data = await res.json();

    if (!data.files) {
      alert("Gagal load folder!");
      return;
    }

    currentFiles = data.files;
    renderFiles(currentFiles);

  } catch (err) {
    console.error(err);
    alert("Error ambil data Drive!");
  }
}

// =======================
// 🎨 RENDER FILE
// =======================
function renderFiles(files) {
  fileGrid.innerHTML = "";

  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file";

    const isFolder =
      file.mimeType === "application/vnd.google-apps.folder";

    let icon = "";

    if (isFolder) {
      icon = "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    } else if (file.mimeType.includes("image")) {
      icon = `https://drive.google.com/thumbnail?id=${file.id}`;
    } else if (file.mimeType.includes("pdf")) {
      icon = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
    } else if (file.mimeType.includes("video")) {
      icon = "https://cdn-icons-png.flaticon.com/512/727/727245.png";
    } else {
      icon = "https://cdn-icons-png.flaticon.com/512/109/109612.png";
    }

    div.innerHTML = `
      <img src="${icon}" class="file-icon">
      <p class="file-name">${file.name}</p>
    `;

    div.onclick = () => {
      if (isFolder) loadFolder(file.id);
      else openViewer(file.id);
    };

    fileGrid.appendChild(div);
  });
}

// =======================
// 🔙 GO BACK
// =======================
function goBack() {
  historyStack.pop();
  const prev = historyStack.pop();
  if (prev) loadFolder(prev);
}

// =======================
// 📄 VIEWER
// =======================
function openViewer(fileId) {
  viewer.style.display = "block";
  viewerFrame.src = `https://drive.google.com/file/d/${fileId}/preview`;
}

document.getElementById("closeViewer").onclick = () => {
  viewer.style.display = "none";
  viewerFrame.src = "";
};
