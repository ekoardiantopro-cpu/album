// =======================
// 🔥 FIREBASE IMPORT
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =======================
// 🔥 CONFIG
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A",
  authDomain: "album-ff46e.firebaseapp.com",
  projectId: "album-ff46e",
  appId: "1:112694935492:web:e5696cae239c50367eee91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// 🔑 GOOGLE DRIVE API
// =======================
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

// =======================
// 🎯 DOM
// =======================
const loginBox = document.getElementById("loginBox");
const appContainer = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
const fileGrid = document.getElementById("fileGrid");
const viewer = document.getElementById("viewer");
const backBtn = document.getElementById("backBtn");
const searchInput = document.getElementById("searchInput");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const phoneInput = document.getElementById("phone");
const promptInput = document.getElementById("prompt");
const timeInput = document.getElementById("time");
const saveBtn = document.getElementById("saveBtn");

// Viewer
const viewerImage = document.getElementById("viewerImage");
const viewerLoading = document.getElementById("viewerLoading");
const viewerFileName = document.getElementById("viewerFileName");
const viewerCounter = document.getElementById("viewerCounter");
const downloadBtn = document.getElementById("downloadBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const slideshowBtn = document.getElementById("slideshowBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const imageContainer = document.getElementById("imageContainer");

// =======================
// STATE
// =======================
let historyStack = [];
let currentFiles = [];
let currentPhotoFiles = [];
let currentPhotoIndex = 0;
let slideshowTimer = null;
let zoomLevel = 1;
let sentCache = {};
let touchStartX = 0;
let touchStartY = 0;

// =======================
// HELPERS
// =======================
function isImageFile(file) {
  return Boolean(
    file &&
    (
      file.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name)
    )
  );
}

function getThumbnailUrl(file, size = 400) {
  return (
    file.thumbnailLink ||
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w${size}`
  );
}

function getOriginalDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function getDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function getImageFiles() {
  return currentPhotoFiles;
}

// =======================
// 🔐 LOGIN
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
    console.error(err);
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
    closeViewer();
  }
});

// =======================
// 🔥 SIMPAN FIRESTORE
// =======================
saveBtn.onclick = async () => {
  const phone = phoneInput.value.trim();
  const prompt = promptInput.value.trim();
  const time = timeInput.value;

  if (!phone || !prompt || !time) {
    alert("Isi semua field!");
    return;
  }

  try {
    await addDoc(collection(db, "scheduled_messages"), {
      phone,
      prompt,
      time,
      active: true,
      createdAt: new Date()
    });

    alert("✅ Jadwal tersimpan!");
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
};

// =======================
// 📂 LOAD FOLDER
// =======================
document.querySelectorAll("#folders button").forEach(btn => {
  btn.onclick = () => {
    searchInput.value = "";
    loadFolder(btn.dataset.id);
  };
});

async function loadFolder(folderId) {
  historyStack.push(folderId);
  backBtn.style.display = historyStack.length > 1 ? "block" : "none";

  try {
    const url =
      `https://www.googleapis.com/drive/v3/files` +
      `?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false` +
      `&fields=files(id,name,mimeType,thumbnailLink)` +
      `&orderBy=folder,name` +
      `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("Google Drive API error:", data.error || data);
      alert("Error load folder: " + (data.error?.message || `HTTP ${res.status}`));
      historyStack.pop();
      backBtn.style.display = historyStack.length > 1 ? "block" : "none";
      return;
    }

    currentFiles = data.files || [];
    renderFiles(currentFiles);

  } catch (err) {
    console.error(err);
    alert("Error load folder!");
    historyStack.pop();
    backBtn.style.display = historyStack.length > 1 ? "block" : "none";
  }
}

// =======================
// 🎨 RENDER FILE
// =======================
function renderFiles(files) {
  fileGrid.innerHTML = "";

  if (!files.length) {
    fileGrid.innerHTML = '<div class="file-name">Tidak ada file.</div>';
    return;
  }

  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file";

    const isFolder =
      file.mimeType === "application/vnd.google-apps.folder";

    let icon;

    if (isFolder) {
      icon = "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    } else if (isImageFile(file)) {
      icon = getThumbnailUrl(file, 400);
    } else {
      icon = "https://cdn-icons-png.flaticon.com/512/109/109612.png";
    }

    div.innerHTML = `
      <img src="${icon}" class="file-icon" loading="lazy" alt="">
      <p class="file-name"></p>
    `;

    div.querySelector(".file-name").textContent = file.name;

    const img = div.querySelector(".file-icon");
    img.addEventListener("error", () => {
      if (isImageFile(file)) {
        img.src = "https://cdn-icons-png.flaticon.com/512/109/109612.png";
      }
    }, { once: true });

    div.onclick = () => {
      if (isFolder) {
        loadFolder(file.id);
      } else if (isImageFile(file)) {
        // Foto yang tampil di viewer mengikuti isi folder saat ini,
        // bukan hasil pencarian yang sedang difilter.
        currentPhotoFiles = currentFiles.filter(isImageFile);

        const index =
          currentPhotoFiles.findIndex(item => item.id === file.id);

        if (index >= 0) {
          openViewer(index);
        }
      } else {
        window.open(getDriveViewUrl(file.id), "_blank", "noopener");
      }
    };

    fileGrid.appendChild(div);
  });
}

// =======================
// 🔙 BACK
// =======================
backBtn.onclick = () => {
  if (historyStack.length <= 1) {
    backBtn.style.display = "none";
    return;
  }

  historyStack.pop();
  const prev = historyStack[historyStack.length - 1];

  if (prev) {
    searchInput.value = "";
    loadFolderWithoutHistory(prev);
  }
};

async function loadFolderWithoutHistory(folderId) {
  try {
    const url =
      `https://www.googleapis.com/drive/v3/files` +
      `?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false` +
      `&fields=files(id,name,mimeType,thumbnailLink)` +
      `&orderBy=folder,name` +
      `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("Google Drive API error:", data.error || data);
      alert("Error load folder: " + (data.error?.message || `HTTP ${res.status}`));
      return;
    }

    currentFiles = data.files || [];
    renderFiles(currentFiles);
    backBtn.style.display = historyStack.length > 1 ? "block" : "none";

  } catch (err) {
    console.error(err);
    alert("Error load folder!");
  }
};

// =======================
// 🔍 SEARCH
// =======================
searchInput.addEventListener("input", e => {
  const keyword = e.target.value.toLowerCase().trim();

  const filtered = currentFiles.filter(f =>
    f.name.toLowerCase().includes(keyword)
  );

  renderFiles(filtered);
});

// =======================
// 📸 PHOTO VIEWER
// =======================
function openViewer(index) {
  if (!currentPhotoFiles.length || index < 0) {
    return;
  }

  currentPhotoIndex = index;
  viewer.style.display = "flex";
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  showPhoto(currentPhotoIndex);
}

function showPhoto(index) {
  if (!currentPhotoFiles.length) {
    return;
  }

  if (index < 0) {
    index = currentPhotoFiles.length - 1;
  }

  if (index >= currentPhotoFiles.length) {
    index = 0;
  }

  currentPhotoIndex = index;

  const file = currentPhotoFiles[index];

  viewerLoading.style.display = "block";
  viewerImage.style.display = "none";

  zoomLevel = 1;
  viewerImage.style.transform = "scale(1)";

  viewerFileName.textContent = file.name;
  viewerCounter.textContent =
    `${index + 1} / ${currentPhotoFiles.length}`;

  downloadBtn.href = getOriginalDownloadUrl(file.id);
  downloadBtn.download = file.name;

  // Preview besar untuk viewer; file original hanya dipanggil saat download.
  viewerImage.src = getThumbnailUrl(file, 1600);

  viewerImage.onload = () => {
    viewerLoading.style.display = "none";
    viewerImage.style.display = "block";
  };

  viewerImage.onerror = () => {
    viewerLoading.style.display = "none";
    viewerImage.style.display = "none";
    alert("Preview foto tidak dapat dimuat.");
  };
}

// =======================
// ← / →
// =======================
prevBtn.onclick = () => showPhoto(currentPhotoIndex - 1);
nextBtn.onclick = () => showPhoto(currentPhotoIndex + 1);

// =======================
// ⌨️ KEYBOARD
// =======================
document.addEventListener("keydown", e => {
  if (viewer.style.display !== "flex") {
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    showPhoto(currentPhotoIndex - 1);
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    showPhoto(currentPhotoIndex + 1);
  }

  if (e.key === "Escape") {
    closeViewer();
  }
});

// =======================
// ❌ CLOSE
// =======================
function closeViewer() {
  viewer.style.display = "none";
  viewer.setAttribute("aria-hidden", "true");
  viewerImage.src = "";
  viewerImage.style.display = "none";
  viewerLoading.style.display = "none";
  document.body.style.overflow = "";

  stopSlideshow();

  zoomLevel = 1;
  viewerImage.style.transform = "scale(1)";
}

document.getElementById("closeViewer").onclick = closeViewer;

// =======================
// ⛶ FULLSCREEN
// =======================
fullscreenBtn.onclick = async () => {
  try {
    if (!document.fullscreenElement) {
      await viewer.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.error("Fullscreen error:", err);
  }
};

// =======================
// 🔗 COPY LINK
// =======================
copyLinkBtn.onclick = async () => {
  const file = currentPhotoFiles[currentPhotoIndex];

  if (!file) {
    return;
  }

  const link = getDriveViewUrl(file.id);

  try {
    await navigator.clipboard.writeText(link);

    copyLinkBtn.textContent = "✓";

    setTimeout(() => {
      copyLinkBtn.textContent = "🔗";
    }, 1200);

  } catch (err) {
    console.error(err);
    alert("Tidak bisa menyalin link.");
  }
};

// =======================
// 🔍 ZOOM
// =======================
function applyZoom() {
  viewerImage.style.transform = `scale(${zoomLevel})`;
  viewerImage.style.cursor = zoomLevel > 1 ? "grab" : "zoom-in";
}

viewerImage.addEventListener("dblclick", () => {
  zoomLevel = zoomLevel === 1 ? 2 : 1;
  applyZoom();
});

imageContainer.addEventListener("wheel", e => {
  if (viewer.style.display !== "flex") {
    return;
  }

  e.preventDefault();

  zoomLevel += e.deltaY < 0 ? 0.2 : -0.2;
  zoomLevel = Math.max(1, Math.min(4, zoomLevel));

  applyZoom();
}, { passive: false });

// =======================
// ▶ SLIDESHOW
// =======================
function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }

  slideshowBtn.textContent = "▶";
}

slideshowBtn.onclick = () => {
  if (slideshowTimer) {
    stopSlideshow();
    return;
  }

  slideshowBtn.textContent = "⏸";

  slideshowTimer = setInterval(() => {
    showPhoto(currentPhotoIndex + 1);
  }, 4000);
};

// =======================
// 📱 SWIPE
// =======================
imageContainer.addEventListener("touchstart", e => {
  if (e.touches.length !== 1) {
    return;
  }

  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

imageContainer.addEventListener("touchend", e => {
  if (!touchStartX || !touchStartY) {
    return;
  }

  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;

  const diffX = endX - touchStartX;
  const diffY = endY - touchStartY;

  touchStartX = 0;
  touchStartY = 0;

  if (
    Math.abs(diffX) < 60 ||
    Math.abs(diffX) < Math.abs(diffY)
  ) {
    return;
  }

  if (diffX < 0) {
    showPhoto(currentPhotoIndex + 1);
  } else {
    showPhoto(currentPhotoIndex - 1);
  }
}, { passive: true });

// =======================
// ⏰ AUTO WHATSAPP
// =======================
setInterval(async () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  try {
    const snapshot =
      await getDocs(collection(db, "scheduled_messages"));

    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;

      if (
        data.time === currentTime &&
        data.active &&
        !sentCache[id]
      ) {
        console.log("Kirim WA ke:", data.phone);

        const url =
          `https://wa.me/${String(data.phone).replace("+", "")}` +
          `?text=${encodeURIComponent(data.prompt)}`;

        window.open(url, "_blank");

        sentCache[id] = true;
      }
    });
  } catch (err) {
    console.error("Auto WhatsApp error:", err);
  }
}, 10000);
