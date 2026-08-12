// =======================
// FIREBASE IMPORT
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
// FIREBASE CONFIG
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
// GOOGLE DRIVE API
// =======================
const API_KEY = "AIzaSyCYmrtHJZoVViIqHGn-frI3AXDL85l4Q-A";

// =======================
// DOM
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

function getImageFiles() {
  return currentFiles.filter(isImageFile);
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

// =======================
// LOGIN
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
// LOGOUT
// =======================
logoutBtn.onclick = () => signOut(auth);

// =======================
// AUTH STATE
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
// FIRESTORE SCHEDULE
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
// FOLDER BUTTONS
// =======================
document.querySelectorAll("#folders button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const folderId = btn.dataset.id;

    if (folderId) {
      loadFolder(folderId);
    }
  });
});

// =======================
// LOAD FOLDER
// =======================
async function loadFolder(folderId) {
  historyStack.push(folderId);

  backBtn.style.display =
    historyStack.length > 1 ? "block" : "none";

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
      alert(
        "Error load folder: " +
        (data.error?.message || `HTTP ${res.status}`)
      );
      historyStack.pop();
      backBtn.style.display =
        historyStack.length > 1 ? "block" : "none";
      return;
    }

    currentFiles = data.files || [];
    renderFiles(currentFiles);
  } catch (err) {
    console.error(err);
    alert("Error load folder!");
    historyStack.pop();
    backBtn.style.display =
      historyStack.length > 1 ? "block" : "none";
  }
}

// =======================
// RENDER FILES
// =======================
function renderFiles(files) {
  fileGrid.innerHTML = "";

  if (!files.length) {
    fileGrid.innerHTML =
      '<p class="empty-state">Tidak ada file.</p>';
    return;
  }

  files.forEach((file) => {
    const div = document.createElement("div");
    div.className = "file";

    const isFolder =
      file.mimeType === "application/vnd.google-apps.folder";

    let imageUrl;

    if (isFolder) {
      imageUrl =
        "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    } else if (isImageFile(file)) {
      imageUrl = getThumbnailUrl(file, 400);
    } else {
      imageUrl =
        "https://cdn-icons-png.flaticon.com/512/109/109612.png";
    }

    div.innerHTML = `
      <img
        src="${imageUrl}"
        class="file-icon"
        loading="lazy"
        alt=""
      >
      <p class="file-name"></p>
    `;

    div.querySelector(".file-name").textContent = file.name;

    const img = div.querySelector(".file-icon");

    img.addEventListener("error", () => {
      if (!isFolder) {
        img.src =
          "https://cdn-icons-png.flaticon.com/512/109/109612.png";
      }
    }, { once: true });

    div.addEventListener("click", () => {
      if (isFolder) {
        loadFolder(file.id);
        return;
      }

      if (!isImageFile(file)) {
        window.open(getDriveViewUrl(file.id), "_blank", "noopener");
        return;
      }

      const imageFiles = getImageFiles();
      const index =
        imageFiles.findIndex((item) => item.id === file.id);

      openViewer(imageFiles, index);
    });

    fileGrid.appendChild(div);
  });
}

// =======================
// BACK
// =======================
backBtn.onclick = () => {
  if (historyStack.length <= 1) {
    backBtn.style.display = "none";
    return;
  }

  historyStack.pop();

  const previousFolder =
    historyStack[historyStack.length - 1];

  if (previousFolder) {
    backBtn.style.display =
      historyStack.length > 1 ? "block" : "none";

    loadFolderWithoutHistory(previousFolder);
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
      alert(
        "Error load folder: " +
        (data.error?.message || `HTTP ${res.status}`)
      );
      return;
    }

    currentFiles = data.files || [];
    renderFiles(currentFiles);
  } catch (err) {
    console.error(err);
    alert("Error load folder!");
  }
}

// =======================
// SEARCH
// =======================
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase().trim();

  const filtered = currentFiles.filter((file) =>
    file.name.toLowerCase().includes(keyword)
  );

  renderFiles(filtered);
});

// =======================
// OPEN VIEWER
// =======================
function openViewer(files, index) {
  if (!files.length || index < 0) {
    return;
  }

  currentPhotoIndex = index;
  viewer.style.display = "flex";
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  showPhoto(currentPhotoIndex);
}

// =======================
// SHOW PHOTO
// =======================
function showPhoto(index) {
  const imageFiles = getImageFiles();

  if (!imageFiles.length) {
    return;
  }

  if (index < 0) {
    index = imageFiles.length - 1;
  }

  if (index >= imageFiles.length) {
    index = 0;
  }

  currentPhotoIndex = index;

  const file = imageFiles[index];

  viewerLoading.style.display = "block";
  viewerImage.style.display = "none";

  zoomLevel = 1;
  viewerImage.style.transform = "scale(1)";

  viewerFileName.textContent = file.name;
  viewerCounter.textContent =
    `${index + 1} / ${imageFiles.length}`;

  downloadBtn.href =
    getOriginalDownloadUrl(file.id);

  // Viewer memakai thumbnail besar supaya tidak menarik
  // file original berulang kali.
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
// PREVIOUS / NEXT
// =======================
prevBtn.onclick = () => {
  showPhoto(currentPhotoIndex - 1);
};

nextBtn.onclick = () => {
  showPhoto(currentPhotoIndex + 1);
};

// =======================
// KEYBOARD
// =======================
document.addEventListener("keydown", (e) => {
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
// CLOSE VIEWER
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
// DOWNLOAD
// =======================
downloadBtn.addEventListener("click", () => {
  const imageFiles = getImageFiles();
  const file = imageFiles[currentPhotoIndex];

  if (!file) {
    return;
  }

  downloadBtn.href = getOriginalDownloadUrl(file.id);
});

// =======================
// COPY LINK
// =======================
copyLinkBtn.onclick = async () => {
  const imageFiles = getImageFiles();
  const file = imageFiles[currentPhotoIndex];

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
// FULLSCREEN
// =======================
fullscreenBtn.onclick = async () => {
  try {
    if (!document.fullscreenElement) {
      await viewer.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.error(err);
  }
};

// =======================
// ZOOM
// =======================
function applyZoom() {
  viewerImage.style.transform =
    `scale(${zoomLevel})`;

  viewerImage.style.cursor =
    zoomLevel > 1 ? "grab" : "zoom-in";
}

viewerImage.addEventListener("dblclick", () => {
  zoomLevel = zoomLevel === 1 ? 2 : 1;
  applyZoom();
});

imageContainer.addEventListener(
  "wheel",
  (e) => {
    if (viewer.style.display !== "flex") {
      return;
    }

    e.preventDefault();

    zoomLevel += e.deltaY < 0 ? 0.2 : -0.2;
    zoomLevel = Math.max(1, Math.min(4, zoomLevel));

    applyZoom();
  },
  { passive: false }
);

// =======================
// SLIDESHOW
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
// TOUCH / SWIPE
// =======================
imageContainer.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) {
      return;
    }

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  },
  { passive: true }
);

imageContainer.addEventListener(
  "touchend",
  (e) => {
    if (!touchStartX || !touchStartY) {
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - touchStartX;
    const diffY = endY - touchStartY;

    touchStartX = 0;
    touchStartY = 0;

    // Swipe hanya jika gerakan horizontal cukup jelas.
    if (Math.abs(diffX) < 60 || Math.abs(diffX) < Math.abs(diffY)) {
      return;
    }

    if (diffX < 0) {
      showPhoto(currentPhotoIndex + 1);
    } else {
      showPhoto(currentPhotoIndex - 1);
    }
  },
  { passive: true }
);

// =======================
// AUTO WHATSAPP
// =======================
setInterval(async () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  try {
    const snapshot =
      await getDocs(collection(db, "scheduled_messages"));

    snapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;

      if (
        data.time === currentTime &&
        data.active &&
        !sentCache[id]
      ) {
        console.log("Kirim WA ke:", data.phone);

        const phone =
          String(data.phone).replace("+", "");

        const url =
          `https://wa.me/${phone}?text=${encodeURIComponent(data.prompt)}`;

        window.open(url, "_blank", "noopener");

        sentCache[id] = true;
      }
    });
  } catch (err) {
    console.error("Auto WhatsApp error:", err);
  }
}, 10000);
