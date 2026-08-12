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
// CONFIG
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
const sortSelect = document.getElementById("sortSelect");
const favoritesBtn = document.getElementById("favoritesBtn");
const selectModeBtn = document.getElementById("selectModeBtn");
const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");
const selectionBar = document.getElementById("selectionBar");
const selectedCount = document.getElementById("selectedCount");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const phoneInput = document.getElementById("phone");
const promptInput = document.getElementById("prompt");
const timeInput = document.getElementById("time");
const saveBtn = document.getElementById("saveBtn");

const viewerImage = document.getElementById("viewerImage");
const viewerLoading = document.getElementById("viewerLoading");
const viewerHint = document.getElementById("viewerHint");
const viewerFileName = document.getElementById("viewerFileName");
const viewerCounter = document.getElementById("viewerCounter");
const downloadBtn = document.getElementById("downloadBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const favoriteViewerBtn = document.getElementById("favoriteViewerBtn");
const slideshowBtn = document.getElementById("slideshowBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const imageContainer = document.getElementById("imageContainer");

// =======================
// STATE
// =======================
let historyStack = [];
let currentFiles = [];
let visibleFiles = [];
let currentPhotoFiles = [];
let currentPhotoIndex = 0;

let slideshowTimer = null;
let zoomLevel = 1;
let panX = 0;
let panY = 0;

let isOriginalLoaded = false;
let originalLoadStarted = false;
let preloadedUrls = new Set();

let showFavoritesOnly = false;
let selectionMode = false;
const selectedFileIds = new Set();

let favorites = new Set(
  JSON.parse(localStorage.getItem("eko_album_favorites") || "[]")
);

let sentCache = {};
let pointerMap = new Map();
let lastPinchDistance = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragging = false;

// Preview besar, tetapi original hanya dimuat saat zoom tinggi / download.
const PREVIEW_SIZE = 2400;
const ORIGINAL_ZOOM_THRESHOLD = 1.8;

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

function getOriginalViewUrl(fileId) {
  // API media endpoint usually works better for direct image rendering.
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${API_KEY}`;
}

function getFallbackOriginalViewUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

function getDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function getImageFiles() {
  return currentPhotoFiles;
}

function saveFavorites() {
  localStorage.setItem(
    "eko_album_favorites",
    JSON.stringify([...favorites])
  );
}

function isFavorite(fileId) {
  return favorites.has(fileId);
}

function toggleFavorite(fileId) {
  if (favorites.has(fileId)) {
    favorites.delete(fileId);
  } else {
    favorites.add(fileId);
  }

  saveFavorites();
  updateViewerFavorite();

  if (showFavoritesOnly) {
    renderCurrentView();
  }
}

function formatDate(file) {
  const value = file.modifiedTime || file.createdTime;
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatFileSize(size) {
  const bytes = Number(size);
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function matchesSearch(file, keyword) {
  if (!keyword) return true;

  const haystack = [
    file.name,
    file.mimeType,
    file.modifiedTime || "",
    file.createdTime || "",
    formatDate(file)
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword);
}

function sortFiles(files) {
  const result = [...files];

  switch (sortSelect.value) {
    case "oldest":
      result.sort(
        (a, b) =>
          new Date(a.modifiedTime || a.createdTime || 0) -
          new Date(b.modifiedTime || b.createdTime || 0)
      );
      break;

    case "nameAsc":
      result.sort((a, b) =>
        a.name.localeCompare(b.name, "id", { sensitivity: "base" })
      );
      break;

    case "nameDesc":
      result.sort((a, b) =>
        b.name.localeCompare(a.name, "id", { sensitivity: "base" })
      );
      break;

    case "newest":
    default:
      result.sort(
        (a, b) =>
          new Date(b.modifiedTime || b.createdTime || 0) -
          new Date(a.modifiedTime || a.createdTime || 0)
      );
      break;
  }

  return result;
}

function getFilteredFiles() {
  const keyword = searchInput.value.toLowerCase().trim();

  let files = currentFiles.filter(file =>
    matchesSearch(file, keyword)
  );

  if (showFavoritesOnly) {
    files = files.filter(file => isFavorite(file.id));
  }

  return sortFiles(files);
}

function renderCurrentView() {
  visibleFiles = getFilteredFiles();
  renderFiles(visibleFiles);
}

function getFileById(fileId) {
  return currentFiles.find(file => file.id === fileId)
    || currentPhotoFiles.find(file => file.id === fileId)
    || null;
}

function updateSelectionUI() {
  selectedCount.textContent = selectedFileIds.size;
  selectionBar.style.display = selectionMode ? "flex" : "none";
  downloadSelectedBtn.style.display =
    selectionMode && selectedFileIds.size ? "inline-flex" : "none";

  selectModeBtn.classList.toggle("active", selectionMode);
  selectModeBtn.title = selectionMode
    ? "Selesai memilih"
    : "Pilih foto";
}

function clearSelection() {
  selectedFileIds.clear();
  updateSelectionUI();
  renderCurrentView();
}

function toggleSelected(fileId) {
  if (selectedFileIds.has(fileId)) {
    selectedFileIds.delete(fileId);
  } else {
    selectedFileIds.add(fileId);
  }

  updateSelectionUI();
  renderCurrentView();
}

function showHint() {
  viewerHint.classList.add("show");
  clearTimeout(showHint.timer);
  showHint.timer = setTimeout(() => {
    viewerHint.classList.remove("show");
  }, 2200);
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

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    loginBox.style.display = "none";
    appContainer.style.display = "block";
    logoutBtn.style.display = "block";
    settingsBtn.style.display = "inline-flex";
  } else {
    loginBox.style.display = "block";
    appContainer.style.display = "none";
    logoutBtn.style.display = "none";
    settingsBtn.style.display = "none";
    closeSettings();
    closeViewer();
  }
});

// =======================
// FIRESTORE
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
// FOLDER
// =======================
document.querySelectorAll("#folders button").forEach(btn => {
  btn.onclick = () => {
    searchInput.value = "";
    showFavoritesOnly = false;
    favoritesBtn.classList.remove("active");
    loadFolder(btn.dataset.id);
  };
});

async function fetchFolder(folderId) {
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false` +
    `&fields=files(id,name,mimeType,thumbnailLink,modifiedTime,createdTime,size,webContentLink)` +
    `&orderBy=folder,name` +
    `&pageSize=1000` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `HTTP ${res.status}`
    );
  }

  return data.files || [];
}

async function loadFolder(folderId) {
  historyStack.push(folderId);
  backBtn.style.display =
    historyStack.length > 1 ? "block" : "none";

  try {
    currentFiles = await fetchFolder(folderId);
    renderCurrentView();
  } catch (err) {
    console.error(err);
    alert("Error load folder: " + err.message);
    historyStack.pop();
    backBtn.style.display =
      historyStack.length > 1 ? "block" : "none";
  }
}

backBtn.onclick = async () => {
  if (historyStack.length <= 1) {
    backBtn.style.display = "none";
    return;
  }

  historyStack.pop();
  const previousFolder =
    historyStack[historyStack.length - 1];

  searchInput.value = "";

  if (previousFolder) {
    try {
      currentFiles = await fetchFolder(previousFolder);
      renderCurrentView();
    } catch (err) {
      console.error(err);
      alert("Error kembali ke folder: " + err.message);
    }
  }

  backBtn.style.display =
    historyStack.length > 1 ? "block" : "none";
};

// =======================
// RENDER GRID
// =======================
function renderFiles(files) {
  fileGrid.innerHTML = "";

  if (!files.length) {
    fileGrid.innerHTML =
      '<div class="empty-state">Tidak ada file yang cocok.</div>';
    return;
  }

  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file";

    const isFolder =
      file.mimeType === "application/vnd.google-apps.folder";

    if (selectedFileIds.has(file.id)) {
      div.classList.add("selected");
    }

    const icon = isFolder
      ? "https://cdn-icons-png.flaticon.com/512/716/716784.png"
      : isImageFile(file)
        ? getThumbnailUrl(file, 600)
        : "https://cdn-icons-png.flaticon.com/512/109/109612.png";

    div.innerHTML = `
      ${
        isImageFile(file) && !isFolder
          ? `<button class="select-toggle ${selectedFileIds.has(file.id) ? "active" : ""}"
                    title="Pilih"
                    aria-label="Pilih">✓</button>`
          : ""
      }
      ${
        isImageFile(file) && !isFolder
          ? `<button class="favorite-toggle ${isFavorite(file.id) ? "active" : ""}"
                    title="Favorit"
                    aria-label="Favorit">${isFavorite(file.id) ? "♥" : "♡"}</button>`
          : ""
      }
      <img src="${icon}" class="file-icon" loading="lazy" alt="">
      <p class="file-name"></p>
      ${
        isFolder
          ? ""
          : `<div class="file-meta">${formatDate(file)}${file.size ? " • " + formatFileSize(file.size) : ""}</div>`
      }
    `;

    div.querySelector(".file-name").textContent = file.name;

    const img = div.querySelector(".file-icon");
    img.addEventListener("error", () => {
      if (isImageFile(file)) {
        img.src =
          "https://cdn-icons-png.flaticon.com/512/109/109612.png";
      }
    }, { once: true });

    const favoriteToggle =
      div.querySelector(".favorite-toggle");

    if (favoriteToggle) {
      favoriteToggle.onclick = event => {
        event.stopPropagation();
        toggleFavorite(file.id);
      };
    }

    const selectToggle =
      div.querySelector(".select-toggle");

    if (selectToggle) {
      selectToggle.onclick = event => {
        event.stopPropagation();
        toggleSelected(file.id);
      };
    }

    div.onclick = () => {
      if (selectionMode && isImageFile(file)) {
        toggleSelected(file.id);
        return;
      }

      if (isFolder) {
        loadFolder(file.id);
        return;
      }

      if (!isImageFile(file)) {
        window.open(getDriveViewUrl(file.id), "_blank", "noopener");
        return;
      }

      const imageFiles = files.filter(isImageFile);
      const index = imageFiles.findIndex(item => item.id === file.id);

      if (index >= 0) {
        currentPhotoFiles = imageFiles;
        openViewer(index);
      }
    };

    fileGrid.appendChild(div);
  });
}

// =======================
// SEARCH / SORT / FILTER
// =======================
searchInput.addEventListener("input", renderCurrentView);

sortSelect.addEventListener("change", renderCurrentView);

favoritesBtn.onclick = () => {
  showFavoritesOnly = !showFavoritesOnly;
  favoritesBtn.classList.toggle("active", showFavoritesOnly);
  favoritesBtn.textContent = showFavoritesOnly ? "♥" : "♡";
  favoritesBtn.title = showFavoritesOnly
    ? "Tampilkan semua"
    : "Tampilkan favorit";
  renderCurrentView();
};

selectModeBtn.onclick = () => {
  selectionMode = !selectionMode;

  if (!selectionMode) {
    selectedFileIds.clear();
  }

  updateSelectionUI();
  renderCurrentView();
};

clearSelectionBtn.onclick = clearSelection;

// =======================
// VIEWER
// =======================
function openViewer(index) {
  if (!currentPhotoFiles.length || index < 0) return;

  currentPhotoIndex = index;
  viewer.style.display = "flex";
  viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("viewer-open");

  resetZoom();
  showPhoto(currentPhotoIndex);
}

function getPreviewUrl(file) {
  // Gunakan thumbnail Drive hanya sebagai fallback.
  // Viewer utama sekarang langsung memuat file original agar foto tidak kecil.
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w2400`;
}

function loadOriginalForZoom() {
  // Foto viewer sudah menggunakan original sejak awal.
  // Fungsi dipertahankan agar alur zoom lama tetap kompatibel.
  return;
}

function prefetchAround(index) {
  const indexes = [
    index + 1,
    index + 2,
    index - 1
  ];

  indexes.forEach(i => {
    if (i < 0 || i >= currentPhotoFiles.length) return;

    const file = currentPhotoFiles[i];
    const url = getOriginalViewUrl(file.id);

    if (preloadedUrls.has(url)) return;

    const img = new Image();
    img.decoding = "async";
    img.src = url;
    preloadedUrls.add(url);
  });
}

function showPhoto(index) {
  if (!currentPhotoFiles.length) return;

  if (index < 0) index = currentPhotoFiles.length - 1;
  if (index >= currentPhotoFiles.length) index = 0;

  currentPhotoIndex = index;

  const file = currentPhotoFiles[index];

  viewerLoading.style.display = "block";
  viewerImage.style.display = "none";

  resetZoom();

  isOriginalLoaded = false;
  originalLoadStarted = false;

  viewerFileName.textContent = file.name;
  viewerCounter.textContent =
    `${index + 1} / ${currentPhotoFiles.length}`;

  downloadBtn.href = getOriginalDownloadUrl(file.id);
  downloadBtn.download = file.name;

  updateViewerFavorite();

  // PENTING: viewer langsung memakai file original, bukan thumbnail kecil.
  // Jika original tidak bisa dimuat, baru fallback ke thumbnail besar.
  const originalUrl = getOriginalViewUrl(file.id);
  const fallbackUrl = getPreviewUrl(file);

  let finished = false;

  const showLoaded = (src, original) => {
    if (finished) return;
    finished = true;
    viewerImage.src = src;
    isOriginalLoaded = original;
    viewerLoading.style.display = "none";
    viewerImage.style.display = "block";
    prefetchAround(index);
  };

  viewerImage.onload = () => {
    showLoaded(viewerImage.src, viewerImage.src === originalUrl);
  };

  viewerImage.onerror = () => {
    if (viewerImage.src === fallbackUrl) {
      finished = true;
      viewerLoading.style.display = "none";
      viewerImage.style.display = "none";
      alert("Foto tidak dapat dimuat. Periksa izin file Google Drive.");
      return;
    }

    // Original gagal → gunakan thumbnail besar sebagai fallback.
    viewerImage.src = fallbackUrl;
  };

  viewerImage.src = originalUrl;
}

function updateViewerFavorite() {
  const file = currentPhotoFiles[currentPhotoIndex];
  if (!file) return;

  const active = isFavorite(file.id);

  favoriteViewerBtn.textContent = active ? "♥" : "♡";
  favoriteViewerBtn.classList.toggle("active", active);
}

favoriteViewerBtn.onclick = () => {
  const file = currentPhotoFiles[currentPhotoIndex];
  if (file) toggleFavorite(file.id);
};

prevBtn.onclick = () => showPhoto(currentPhotoIndex - 1);
nextBtn.onclick = () => showPhoto(currentPhotoIndex + 1);

// =======================
// CLOSE VIEWER
// =======================
async function closeViewer() {
  stopSlideshow();

  if (document.fullscreenElement === imageContainer) {
    try {
      await document.exitFullscreen();
    } catch {}
  }

  viewer.style.display = "none";
  viewer.setAttribute("aria-hidden", "true");
  viewerImage.src = "";
  viewerImage.style.display = "none";
  viewerLoading.style.display = "none";

  document.body.classList.remove("viewer-open");

  resetZoom();
}

document.getElementById("closeViewer").onclick = closeViewer;

// Click background to close.
imageContainer.addEventListener("click", event => {
  if (event.target === imageContainer && zoomLevel === 1) {
    closeViewer();
  }
});

// =======================
// FULLSCREEN
// =======================
fullscreenBtn.onclick = async () => {
  try {
    if (document.fullscreenElement === imageContainer) {
      await document.exitFullscreen();
    } else {
      await imageContainer.requestFullscreen();
    }
  } catch (err) {
    console.error("Fullscreen error:", err);
  }
};

document.addEventListener("fullscreenchange", () => {
  const active = document.fullscreenElement === imageContainer;

  fullscreenBtn.textContent = active ? "✕" : "⛶";
  fullscreenBtn.title = active
    ? "Keluar fullscreen"
    : "Fullscreen foto";
  fullscreenBtn.setAttribute(
    "aria-label",
    fullscreenBtn.title
  );
});

// =======================
// COPY LINK
// =======================
copyLinkBtn.onclick = async () => {
  const file = currentPhotoFiles[currentPhotoIndex];
  if (!file) return;

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
// DOWNLOAD ORIGINAL
// =======================
downloadBtn.addEventListener("click", () => {
  const file = currentPhotoFiles[currentPhotoIndex];
  if (!file) return;

  // Download selalu memakai URL original.
  downloadBtn.href = getOriginalDownloadUrl(file.id);
});

// =======================
// ZOOM + PAN
// =======================
function resetZoom() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  applyTransform();
}

function applyTransform() {
  viewerImage.style.transform =
    `translate3d(${panX}px, ${panY}px, 0) scale(${zoomLevel})`;

  imageContainer.classList.toggle(
    "is-zoomed",
    zoomLevel > 1
  );
}

function setZoom(nextZoom, centerX = 0, centerY = 0) {
  const oldZoom = zoomLevel;

  zoomLevel = Math.max(1, Math.min(4, nextZoom));

  if (zoomLevel === 1) {
    panX = 0;
    panY = 0;
  } else if (oldZoom !== zoomLevel) {
    // Keep the movement bounded to avoid losing the photo completely.
    const ratio = zoomLevel / Math.max(oldZoom, 1);
    panX *= ratio;
    panY *= ratio;
  }

  applyTransform();

  if (zoomLevel >= ORIGINAL_ZOOM_THRESHOLD) {
    loadOriginalForZoom();
  }
}

viewerImage.addEventListener("dblclick", event => {
  event.preventDefault();
  setZoom(zoomLevel === 1 ? 2 : 1);
  showHint();
});

imageContainer.addEventListener(
  "wheel",
  event => {
    if (viewer.style.display !== "flex") return;

    event.preventDefault();

    const delta = event.deltaY < 0 ? 0.25 : -0.25;
    setZoom(zoomLevel + delta);
  },
  { passive: false }
);

// =======================
// POINTER DRAG / PINCH
// =======================
function distanceBetween(a, b) {
  return Math.hypot(
    a.clientX - b.clientX,
    a.clientY - b.clientY
  );
}

function midpoint(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

imageContainer.addEventListener("pointerdown", event => {
  if (event.target !== viewerImage && zoomLevel === 1) return;

  imageContainer.setPointerCapture?.(event.pointerId);
  pointerMap.set(event.pointerId, event);

  if (pointerMap.size === 2) {
    const points = [...pointerMap.values()];
    lastPinchDistance = distanceBetween(points[0], points[1]);
    return;
  }

  if (zoomLevel > 1) {
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    imageContainer.classList.add("is-dragging");
  }
});

imageContainer.addEventListener("pointermove", event => {
  if (!pointerMap.has(event.pointerId)) return;

  pointerMap.set(event.pointerId, event);

  if (pointerMap.size === 2) {
    const points = [...pointerMap.values()];
    const distance = distanceBetween(points[0], points[1]);

    if (lastPinchDistance) {
      const scaleDelta = distance / lastPinchDistance;
      setZoom(zoomLevel * scaleDelta);
    }

    lastPinchDistance = distance;
    return;
  }

  if (dragging && zoomLevel > 1) {
    panX = dragOriginX + (event.clientX - dragStartX);
    panY = dragOriginY + (event.clientY - dragStartY);
    applyTransform();
  }
});

function endPointer(event) {
  pointerMap.delete(event.pointerId);

  if (pointerMap.size < 2) {
    lastPinchDistance = 0;
  }

  if (pointerMap.size === 0) {
    dragging = false;
    imageContainer.classList.remove("is-dragging");
  }
}

imageContainer.addEventListener("pointerup", endPointer);
imageContainer.addEventListener("pointercancel", endPointer);

// =======================
// SWIPE
// =======================
let swipeStartX = 0;
let swipeStartY = 0;

imageContainer.addEventListener("touchstart", event => {
  if (event.touches.length !== 1 || zoomLevel > 1) return;

  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
}, { passive: true });

imageContainer.addEventListener("touchend", event => {
  if (!swipeStartX || !swipeStartY || zoomLevel > 1) return;

  const endX = event.changedTouches[0].clientX;
  const endY = event.changedTouches[0].clientY;

  const diffX = endX - swipeStartX;
  const diffY = endY - swipeStartY;

  swipeStartX = 0;
  swipeStartY = 0;

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
// KEYBOARD
// =======================
document.addEventListener("keydown", event => {
  if (viewer.style.display !== "flex") return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(currentPhotoIndex - 1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(currentPhotoIndex + 1);
  }

  if (event.key === "Escape") {
    if (document.fullscreenElement === imageContainer) {
      document.exitFullscreen().catch(() => {});
    } else {
      closeViewer();
    }
  }

  if (event.key === " ") {
    event.preventDefault();
    slideshowBtn.click();
  }
});

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
// MULTI DOWNLOAD AS ZIP
// =======================
async function downloadSelectedAsZip() {
  if (!selectedFileIds.size) return;

  if (typeof JSZip === "undefined") {
    alert("Fitur ZIP belum siap. Coba refresh halaman.");
    return;
  }

  const imageFiles = currentFiles.filter(
    file => selectedFileIds.has(file.id) && isImageFile(file)
  );

  if (!imageFiles.length) {
    alert("Pilih minimal satu foto.");
    return;
  }

  downloadSelectedBtn.disabled = true;
  downloadSelectedBtn.textContent = "…";

  try {
    const zip = new JSZip();
    const usedNames = new Set();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      let response;

      try {
        response = await fetch(getOriginalViewUrl(file.id));
      } catch {
        response = null;
      }

      if (!response || !response.ok) {
        response = await fetch(getOriginalDownloadUrl(file.id));
      }

      if (!response.ok) {
        throw new Error(
          `Gagal mengambil ${file.name} (HTTP ${response.status})`
        );
      }

      const blob = await response.blob();

      let filename = file.name || `foto-${i + 1}`;
      const base = filename.replace(/(\.[^.]+)$/, "");
      const ext = filename.match(/(\.[^.]+)$/)?.[1] || "";

      let candidate = filename;
      let number = 2;

      while (usedNames.has(candidate)) {
        candidate = `${base} (${number++})${ext}`;
      }

      usedNames.add(candidate);
      zip.file(candidate, blob);

      downloadSelectedBtn.textContent =
        `${Math.round(((i + 1) / imageFiles.length) * 100)}%`;
    }

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "STORE"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download =
      `EKO-Album-${new Date().toISOString().slice(0, 10)}.zip`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);

  } catch (err) {
    console.error("ZIP download error:", err);
    alert(
      "Gagal membuat ZIP. Pastikan file Drive dapat diakses publik."
    );
  } finally {
    downloadSelectedBtn.disabled = false;
    downloadSelectedBtn.textContent = "⬇";
    updateSelectionUI();
  }
}

downloadSelectedBtn.onclick = downloadSelectedAsZip;

// =======================
// AUTO WHATSAPP
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
        const phone =
          String(data.phone).replace("+", "");

        const url =
          `https://wa.me/${phone}` +
          `?text=${encodeURIComponent(data.prompt)}`;

        window.open(url, "_blank");
        sentCache[id] = true;
      }
    });
  } catch (err) {
    console.error("Auto WhatsApp error:", err);
  }
}, 10000);

// =======================
// FAMILY THEME / SETTINGS
// =======================
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const backgroundUpload = document.getElementById("backgroundUpload");
const removeBackgroundBtn = document.getElementById("removeBackgroundBtn");
const themeOptions = [...document.querySelectorAll(".theme-option")];
const backgroundOptions = [...document.querySelectorAll(".background-option")];
const accentOptions = [...document.querySelectorAll(".accent-option")];

const THEME_KEY = "eko_album_theme";
const BG_KEY = "eko_album_background";
const ACCENT_KEY = "eko_album_accent";
const CUSTOM_BG_KEY = "eko_album_custom_background";

const backgroundPresets = {
  default: "none",
  sunset: "linear-gradient(135deg, #7c2d12 0%, #db2777 48%, #4c1d95 100%)",
  ocean: "linear-gradient(135deg, #082f49 0%, #0369a1 48%, #164e63 100%)",
  forest: "linear-gradient(135deg, #052e16 0%, #166534 48%, #14532d 100%)"
};

function safeStorageGet(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn("Tidak bisa menyimpan pengaturan:", err);
    return false;
  }
}

function applyTheme(theme) {
  const valid = ["dark", "light", "system"].includes(theme) ? theme : "system";
  document.documentElement.dataset.theme = valid;
  safeStorageSet(THEME_KEY, valid);

  themeOptions.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === valid);
  });
}

function applyAccent(accent) {
  const allowed = accentOptions.map(btn => btn.dataset.accent);
  const value = allowed.includes(accent) ? accent : "#3b82f6";
  document.documentElement.style.setProperty("--accent", value);
  document.documentElement.style.setProperty(
    "--accent-hover",
    value
  );
  safeStorageSet(ACCENT_KEY, value);

  accentOptions.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.accent === value);
  });
}

function applyBackground(type) {
  const preset = backgroundPresets[type];
  if (preset !== undefined) {
    document.documentElement.style.setProperty("--page-bg-image", preset === "none" ? "none" : preset);
    safeStorageSet(BG_KEY, type);
  }

  backgroundOptions.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.bg === type);
  });
}

function applyCustomBackground(dataUrl) {
  if (!dataUrl) return;
  document.documentElement.style.setProperty(
    "--page-bg-image",
    `url("${dataUrl}")`
  );
  safeStorageSet(BG_KEY, "custom");
  safeStorageSet(CUSTOM_BG_KEY, dataUrl);
  backgroundOptions.forEach(btn => btn.classList.remove("active"));
}

function restoreAppearanceSettings() {
  applyTheme(safeStorageGet(THEME_KEY, "system"));
  applyAccent(safeStorageGet(ACCENT_KEY, "#3b82f6"));

  const bg = safeStorageGet(BG_KEY, "default");
  if (bg === "custom") {
    const custom = safeStorageGet(CUSTOM_BG_KEY, "");
    if (custom) applyCustomBackground(custom);
    else applyBackground("default");
  } else {
    applyBackground(bg);
  }
}

function openSettings() {
  settingsPanel.style.display = "flex";
  settingsPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("settings-open");
}

function closeSettings() {
  settingsPanel.style.display = "none";
  settingsPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-open");
}

settingsBtn.onclick = openSettings;
closeSettingsBtn.onclick = closeSettings;

settingsPanel.addEventListener("click", event => {
  if (event.target === settingsPanel) closeSettings();
});

themeOptions.forEach(btn => {
  btn.onclick = () => applyTheme(btn.dataset.theme);
});

backgroundOptions.forEach(btn => {
  btn.onclick = () => {
    try {
      localStorage.removeItem(CUSTOM_BG_KEY);
    } catch {}
    applyBackground(btn.dataset.bg);
  };
});

accentOptions.forEach(btn => {
  btn.onclick = () => applyAccent(btn.dataset.accent);
});

removeBackgroundBtn.onclick = () => {
  try {
    localStorage.removeItem(CUSTOM_BG_KEY);
  } catch {}
  applyBackground("default");
};

backgroundUpload.onchange = event => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("File background harus berupa gambar.");
    backgroundUpload.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      // Kompres background agar tidak memenuhi localStorage.
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const compressed = canvas.toDataURL("image/webp", 0.78);

      if (!safeStorageSet(CUSTOM_BG_KEY, compressed)) {
        alert("Foto terlalu besar untuk disimpan di browser. Coba foto yang lebih kecil.");
        return;
      }

      applyCustomBackground(compressed);
    };

    image.onerror = () => alert("Foto background tidak dapat dibaca.");
    image.src = reader.result;
  };

  reader.readAsDataURL(file);
  backgroundUpload.value = "";
};

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && settingsPanel.style.display === "flex") {
    closeSettings();
  }
});

restoreAppearanceSettings();
