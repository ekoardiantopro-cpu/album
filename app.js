import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// GOOGLE DRIVE API
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

let historyStack = [];

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById("logoutBtn").onclick = () => signOut(auth);

  document.querySelectorAll("#folders button").forEach(btn => {
    btn.onclick = () => loadFolder(btn.dataset.id);
  });

  document.getElementById("backBtn").onclick = goBack;
  document.getElementById("closeViewer").onclick = closeViewer;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBox.style.display = "none";
    app.style.display = "block";
    logoutBtn.style.display = "block";
  } else {
    loginBox.style.display = "block";
    app.style.display = "none";
  }
});

async function loadFolder(folderId) {
  historyStack.push(folderId);

  backBtn.style.display =
    historyStack.length > 1 ? "block" : "none";

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents and trashed=false&fields=files(id,name,mimeType)&key=${API_KEY}`
  );

  const data = await res.json();
  fileGrid.innerHTML = "";

  data.files.forEach(file => {
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

function goBack() {
  historyStack.pop();
  const prev = historyStack.pop();
  if (prev) loadFolder(prev);
}

function openViewer(fileId) {
  viewer.style.display = "block";
  viewerFrame.src = `https://drive.google.com/file/d/${fileId}/preview`;
}

function closeViewer() {
  viewer.style.display = "none";
  viewerFrame.src = "";
}
