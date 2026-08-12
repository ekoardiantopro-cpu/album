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
const sortSelect = document.getElementById("sortSelect");
const favoritesBtn = document.getElementById("favoritesBtn");
const selectModeBtn = document.getElementById("selectModeBtn");
const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");
const selectionBar = document.getElementById("selectionBar");
const selectedCount = document.getElementById("selectedCount");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const homeBtn = document.getElementById("homeBtn");
const recentBtn = document.getElementById("recentBtn");
const searchBtn = document.getElementById("searchBtn");
const homeStatus = document.getElementById("homeStatus");
const foldersEl = document.getElementById("folders");
const runningTextTrack = document.getElementById("runningTextTrack");
const runningTextInput = document.getElementById("runningTextInput");
const runningAnimationSelect = document.getElementById("runningAnimationSelect");
const runningFontSelect = document.getElementById("runningFontSelect");
const saveRunningTextBtn = document.getElementById("saveRunningTextBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

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

let pointerMap = new Map();
let lastPinchDistance = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragging = false;
let recentMode = false;
let globalSearchMode = false;
let localSearchTerm = "";

// Preview besar, tetapi original hanya dimuat saat zoom tinggi / download.
const PREVIEW_SIZE = 2400;
const DEFAULT_DRIVES = [
  { name: "EKO PRO", folderId: "1AoSKM8CXzb1F5gDYP5a0G0SzZTE2JQDT", builtIn: true },
  { name: "EKO 36", folderId: "18ASYGXvMTqU2uw57xHF5JZZbLTSvKQTg", builtIn: true },
  { name: "EKO 03", folderId: "1zXsXINns1ivJOoAnCggsfAjrnSYpUJGW", builtIn: true },
  { name: "CV PROF", folderId: "1K0SOBV82Lot5pPGTh5iRWBclcR0LMbqv", builtIn: true }
];
const DRIVES_KEY = "maheva_drives";
const RECENT_KEY = "maheva_recent";
const SITE_TITLE_KEY = "maheva_site_title";
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

function isVideoFile(file) {
  return Boolean(file && (file.mimeType?.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name)));
}

function isAudioFile(file) {
  return Boolean(file && (file.mimeType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)));
}

function isPdfFile(file) {
  return Boolean(file && (file.mimeType === "application/pdf" || /\.pdf$/i.test(file.name)));
}

function isTextPreviewFile(file) {
  return Boolean(file && (file.mimeType?.startsWith("text/") || /\.(txt|csv|json|xml|md)$/i.test(file.name)));
}

function isPreviewableFile(file) {
  return isImageFile(file) || isVideoFile(file) || isAudioFile(file) || isPdfFile(file) || isTextPreviewFile(file);
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
    file._driveName || "",
    file._path || "",
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
  const keyword = localSearchTerm.toLowerCase().trim();

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
// DRIVES / HOME / RECENT
// =======================
function getDrives() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRIVES_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      return saved.filter(d => d && d.name && d.folderId);
    }
  } catch {}
  return DEFAULT_DRIVES.map(d => ({ ...d }));
}

function saveDrives(drives) {
  safeStorageSet(DRIVES_KEY, JSON.stringify(drives));
}

function renderDriveButtons() {
  const drives = getDrives();
  foldersEl.innerHTML = "";
  drives.forEach((drive, index) => {
    const btn = document.createElement("button");
    btn.dataset.id = drive.folderId;
    btn.dataset.driveName = drive.name;
    btn.textContent = drive.name;
    btn.onclick = () => {
      localSearchTerm = "";
      showFavoritesOnly = false;
      favoritesBtn.classList.remove("active");
      recentMode = false;
      globalSearchMode = false;
      loadFolder(drive.folderId, drive.name);
    };
    foldersEl.appendChild(btn);
  });
}

function getDriveByFolderId(folderId) {
  return getDrives().find(d => d.folderId === folderId) || null;
}

function getRecent() {
  try {
    const data = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRecent(item) {
  const record = {
    ...item,
    timestamp: Date.now()
  };
  const next = [record, ...getRecent().filter(x => x.id !== record.id || x.type !== record.type)];
  safeStorageSet(RECENT_KEY, JSON.stringify(next.slice(0, 40)));
}

function clearRecent() {
  safeStorageSet(RECENT_KEY, "[]");
  renderRecent();
}

function renderRecent() {
  recentMode = true;
  globalSearchMode = false;
  stopSlideshow();
  currentFiles = [];
  visibleFiles = [];
  fileGrid.innerHTML = "";
  backBtn.style.display = "none";
  homeStatus.textContent = "Recent";

  const recent = getRecent();
  if (!recent.length) {
    fileGrid.innerHTML = '<div class="empty-state">Belum ada aktivitas terbaru.</div>';
    return;
  }

  const header = document.createElement("div");
  header.className = "recent-header";
  header.innerHTML = `<strong>Terakhir dibuka</strong><button id="clearRecentBtn" class="small-action">Hapus riwayat</button>`;
  fileGrid.appendChild(header);
  header.querySelector("button").onclick = clearRecent;

  recent.forEach(item => {
    const div = document.createElement("div");
    div.className = "file recent-card";
    const image = item.type === "file" && isImageFile(item);
    div.innerHTML = `
      <img class="file-icon" src="${image ? getThumbnailUrl(item, 600) : "https://cdn-icons-png.flaticon.com/512/716/716784.png"}" loading="lazy" alt="">
      <p class="file-name"></p>
      <div class="file-meta">${item.driveName || ""}${item.path ? " • " + item.path : ""}<br>${new Date(item.timestamp).toLocaleString("id-ID")}</div>
    `;
    div.querySelector(".file-name").textContent = item.name;
    div.onclick = () => {
      if (item.type === "folder") {
        loadFolder(item.id, item.driveName || "Drive");
      } else {
        currentPhotoFiles = recent.filter(x => x.type === "file" && isImageFile(x));
        const index = currentPhotoFiles.findIndex(x => x.id === item.id);
        if (index >= 0) openViewer(index);
      }
    };
    fileGrid.appendChild(div);
  });
}

function goHome() {
  stopSlideshow();
  if (viewer.style.display === "flex") closeViewer();
  historyStack = [];
  currentFiles = [];
  visibleFiles = [];
  currentPhotoFiles = [];
  currentPhotoIndex = -1;
  localSearchTerm = "";
  showFavoritesOnly = false;
  favoritesBtn.classList.remove("active");
  favoritesBtn.textContent = "♡";
  selectionMode = false;
  selectedFileIds.clear();
  recentMode = false;
  globalSearchMode = false;
  updateSelectionUI();
  backBtn.style.display = "none";
  fileGrid.innerHTML = "";
  homeStatus.textContent = "Dashboard";
  renderDriveButtons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function fetchAllChildren(folderId) {
  const files = [];
  let pageToken = "";
  do {
    const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const url = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,modifiedTime,createdTime,size,webContentLink)&orderBy=folder,name&pageSize=1000&key=${API_KEY}${tokenPart}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return files;
}

async function searchAllDrives(keyword) {
  const query = keyword.trim().toLowerCase();
  const results = [];
  const seenFolders = new Set();
  const drives = getDrives();

  async function walk(folderId, driveName, path) {
    if (seenFolders.has(folderId)) return;
    seenFolders.add(folderId);
    const files = await fetchAllChildren(folderId);
    for (const file of files) {
      const item = { ...file, _driveName: driveName, _path: path };
      if (matchesSearch(item, query)) results.push(item);
      if (file.mimeType === "application/vnd.google-apps.folder") {
        await walk(file.id, driveName, path ? `${path}/${file.name}` : file.name);
      }
    }
  }

  for (const drive of drives) {
    await walk(drive.folderId, drive.name, drive.name);
  }
  return results;
}

async function runGlobalSearch(keyword) {
  const query = String(keyword || "").trim();
  if (!query) return;

  searchBtn.disabled = true;
  const previousLabel = homeStatus.textContent;
  homeStatus.textContent = `Mencari: ${query}`;

  try {
    const results = await searchAllDrives(query);
    currentFiles = results;
    visibleFiles = sortFiles(results);
    recentMode = false;
    globalSearchMode = true;
    historyStack = [];
    backBtn.style.display = "none";
    homeStatus.textContent = `Hasil pencarian: ${results.length}`;
    renderFiles(visibleFiles);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    homeStatus.textContent = previousLabel;
    alert(`Pencarian gagal: ${err.message}`);
  } finally {
    searchBtn.disabled = false;
  }
}

renderDriveButtons();

// =======================
// LOGIN
// =======================
async function performLogin() {
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
    showSecurityWarning();
    passwordInput.value = "";
    passwordInput.focus();
  }
}

document.getElementById("loginBtn").onclick = performLogin;

[emailInput, passwordInput].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      performLogin();
    }
  });
});

logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
  } finally {
    emailInput.value = "";
    passwordInput.value = "";
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    loginBox.style.display = "none";
    appContainer.style.display = "block";
    logoutBtn.style.display = "block";
    settingsBtn.style.display = "inline-flex";
    homeBtn.style.display = "inline-flex";
    recentBtn.style.display = "inline-flex";
    searchBtn.style.display = "inline-flex";
    emailInput.value = "";
    passwordInput.value = "";
    goHome();
  } else {
    loginBox.style.display = "block";
    appContainer.style.display = "none";
    logoutBtn.style.display = "none";
    settingsBtn.style.display = "none";
    homeBtn.style.display = "none";
    recentBtn.style.display = "none";
    searchBtn.style.display = "none";
    closeSettings();
    closeViewer();
    emailInput.value = "";
    passwordInput.value = "";
  }
});

// Home selalu kembali ke halaman login awal.
homeBtn.onclick = async () => {
  try { await signOut(auth); } catch (err) { console.error(err); }
};


// =======================
// FOLDER
// =======================
async function loadFolder(folderId, driveName = "") {
  historyStack.push(folderId);
  recentMode = false;
  globalSearchMode = false;
  backBtn.style.display = historyStack.length > 1 ? "block" : "none";
  const drive = getDriveByFolderId(folderId);
  homeStatus.textContent = driveName || drive?.name || "Folder";
  try {
    currentFiles = await fetchFolder(folderId);
    renderCurrentView();
    saveRecent({ type: "folder", id: folderId, name: driveName || drive?.name || "Folder", driveName: driveName || drive?.name || "Drive", path: driveName || "" });
  } catch (err) {
    console.error(err);
    alert("Error load folder: " + err.message);
    historyStack.pop();
    backBtn.style.display = historyStack.length > 1 ? "block" : "none";
  }
}

async function fetchFolder(folderId) {
  return fetchAllChildren(folderId);
}

backBtn.onclick = async () => {
  if (historyStack.length <= 1) {
    backBtn.style.display = "none";
    return;
  }

  historyStack.pop();
  const previousFolder =
    historyStack[historyStack.length - 1];

  localSearchTerm = "";

  if (previousFolder) {
    try {
      currentFiles = await fetchFolder(previousFolder);
      const drive = getDriveByFolderId(previousFolder);
      homeStatus.textContent = drive?.name || "Folder";
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
        saveRecent({ type: "folder", id: file.id, name: file.name, driveName: file._driveName || homeStatus.textContent, path: file._path || file.name });
        loadFolder(file.id, file._driveName || homeStatus.textContent);
        return;
      }

      if (!isPreviewableFile(file)) {
        window.open(getDriveViewUrl(file.id), "_blank", "noopener");
        return;
      }

      const previewFiles = files.filter(isPreviewableFile);
      const index = previewFiles.findIndex(item => item.id === file.id);

      if (index >= 0) {
        currentPhotoFiles = previewFiles;
        saveRecent({ type: "file", ...file, driveName: file._driveName || homeStatus.textContent, path: file._path || "" });
        openViewer(index);
      }
    };

    fileGrid.appendChild(div);
  });
}

// =======================
// SEARCH / SORT / FILTER
// =======================
// Local folder search is now opened with the global Search icon.


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
// HOME / RECENT / GLOBAL SEARCH UI
// =======================
recentBtn.onclick = renderRecent;
searchBtn.onclick = async () => {
  if (searchBtn.disabled) return;
  const keyword = searchInput.value.trim();
  if (keyword) await runGlobalSearch(keyword);
};

searchInput.addEventListener("keydown", async event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const keyword = searchInput.value.trim();
  if (keyword) await runGlobalSearch(keyword);
});

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
  if (isImageFile(file)) return getOriginalViewUrl(file.id);
  return getOriginalDownloadUrl(file.id);
}

function loadOriginalForZoom() { return; }

function prefetchAround(index) {
  const indexes = [index + 1, index + 2, index - 1];
  indexes.forEach(i => {
    if (i < 0 || i >= currentPhotoFiles.length) return;
    const file = currentPhotoFiles[i];
    if (!isImageFile(file)) return;
    const url = getOriginalViewUrl(file.id);
    if (preloadedUrls.has(url)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    preloadedUrls.add(url);
  });
}

function hideViewerMedia() {
  viewerImage.style.display = "none";
  viewerVideo.style.display = "none";
  viewerAudio.style.display = "none";
  viewerFrame.style.display = "none";
  viewerImage.src = "";
  viewerVideo.pause();
  viewerVideo.removeAttribute("src");
  viewerAudio.pause();
  viewerAudio.removeAttribute("src");
  viewerFrame.src = "about:blank";
}

function showPhoto(index) {
  if (!currentPhotoFiles.length) return;
  if (index < 0) index = currentPhotoFiles.length - 1;
  if (index >= currentPhotoFiles.length) index = 0;

  currentPhotoIndex = index;
  const file = currentPhotoFiles[index];
  saveRecent({ type: "file", ...file, driveName: file._driveName || homeStatus.textContent, path: file._path || "" });
  viewerLoading.style.display = "block";
  hideViewerMedia();
  resetZoom();
  viewerFileName.textContent = file.name;
  viewerCounter.textContent = `${index + 1} / ${currentPhotoFiles.length}`;
  downloadBtn.href = getOriginalDownloadUrl(file.id);
  downloadBtn.download = file.name;
  updateViewerFavorite();

  const url = getPreviewUrl(file);

  if (isImageFile(file)) {
    viewerImage.onload = () => {
      viewerLoading.style.display = "none";
      viewerImage.style.display = "block";
      prefetchAround(index);
    };
    viewerImage.onerror = () => {
      viewerLoading.style.display = "none";
      alert("File tidak dapat dimuat. Periksa izin file Google Drive.");
    };
    viewerImage.src = url;
    return;
  }

  if (isVideoFile(file)) {
    viewerVideo.onloadeddata = () => { viewerLoading.style.display = "none"; };
    viewerVideo.onerror = () => { viewerLoading.style.display = "none"; alert("Video tidak dapat diputar. Periksa izin file Google Drive."); };
    viewerVideo.src = url;
    viewerVideo.style.display = "block";
    viewerVideo.load();
    return;
  }

  if (isAudioFile(file)) {
    viewerAudio.onloadeddata = () => { viewerLoading.style.display = "none"; };
    viewerAudio.onerror = () => { viewerLoading.style.display = "none"; alert("Audio tidak dapat diputar. Periksa izin file Google Drive."); };
    viewerAudio.src = url;
    viewerAudio.style.display = "block";
    viewerAudio.load();
    return;
  }

  if (isPdfFile(file)) {
    viewerFrame.onload = () => { viewerLoading.style.display = "none"; };
    viewerFrame.onerror = () => { viewerLoading.style.display = "none"; };
    viewerFrame.src = url;
    viewerFrame.style.display = "block";
    return;
  }

  if (isTextPreviewFile(file)) {
    viewerFrame.onload = () => { viewerLoading.style.display = "none"; };
    viewerFrame.src = url;
    viewerFrame.style.display = "block";
    return;
  }

  viewerLoading.style.display = "none";
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
  hideViewerMedia();
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
// FAMILY THEME / SETTINGS
// =======================
const settingsBtn = document.getElementById("settingsBtn");
const siteTitleInput = document.getElementById("siteTitleInput");
const saveSiteTitleBtn = document.getElementById("saveSiteTitleBtn");
const driveSettingsList = document.getElementById("driveSettingsList");
const driveNameInput = document.getElementById("driveNameInput");
const driveFolderIdInput = document.getElementById("driveFolderIdInput");
const addDriveBtn = document.getElementById("addDriveBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const backgroundUpload = document.getElementById("backgroundUpload");
const removeBackgroundBtn = document.getElementById("removeBackgroundBtn");
const themeOptions = [...document.querySelectorAll(".theme-option")];
const backgroundOptions = [...document.querySelectorAll(".background-option")];
const accentOptions = [...document.querySelectorAll(".accent-option")];
const socialInstagramInput = document.getElementById("socialInstagramInput");
const socialLinkedinInput = document.getElementById("socialLinkedinInput");
const socialYoutubeInput = document.getElementById("socialYoutubeInput");
const socialFacebookInput = document.getElementById("socialFacebookInput");
const saveSocialLinksBtn = document.getElementById("saveSocialLinksBtn");
const securityWarningInput = document.getElementById("securityWarningInput");
const saveSecurityWarningBtn = document.getElementById("saveSecurityWarningBtn");
const socialInstagram = document.getElementById("socialInstagram");
const socialLinkedin = document.getElementById("socialLinkedin");
const socialYoutube = document.getElementById("socialYoutube");
const socialFacebook = document.getElementById("socialFacebook");

const THEME_KEY = "eko_album_theme";
const BG_KEY = "eko_album_background";
const ACCENT_KEY = "eko_album_accent";
const CUSTOM_BG_KEY = "eko_album_custom_background";
const RUNNING_TEXT_KEY = "maheva_running_text";
const RUNNING_ANIMATION_KEY = "maheva_running_animation";
const RUNNING_FONT_KEY = "maheva_running_font";
const SOCIAL_LINKS_KEY = "maheva_social_links";
const SECURITY_WARNING_KEY = "maheva_security_warning";

const DEFAULT_SECURITY_WARNING = `[PERINGATAN KEAMANAN: AKSES ILEGAL TERDETEKSI]
Autentikasi Gagal! Anda tidak memiliki izin untuk mengakses area privat ini.
Sistem firewall kami telah mencatat dan mengunci data Anda:

Alamat IP: Terekam & Terlacak

Lokasi Geografis Perangkat: Teridentifikasi

User-Agent (Browser & OS): Masuk dalam log server

Segala bentuk percobaan login berulang (Brute Force) akan otomatis terlaporkan ke otoritas penyedia layanan internet (ISP) Anda sebagai aktivitas siber ilegal. Segera tinggalkan halaman ini.`;

const runningAnimations = ["marquee-left", "marquee-right", "bounce", "fade", "pulse", "typewriter"];
const runningFonts = ["system", "rounded", "serif", "mono", "cursive"];

function applySiteTitle(value) {
  const title = String(value || "").trim() || "Maheva Family";
  document.title = title;
  document.querySelector("header h2").textContent = `🏠 ${title}`;
  const socialCaption = document.querySelector(".social-caption");
  if (socialCaption) socialCaption.textContent = title;
  siteTitleInput.value = title;
  safeStorageSet(SITE_TITLE_KEY, title);
}

function restoreSiteTitle() {
  applySiteTitle(safeStorageGet(SITE_TITLE_KEY, "Maheva Family"));
}

function renderDriveSettings() {
  driveSettingsList.innerHTML = "";
  getDrives().forEach((drive, index) => {
    const row = document.createElement("div");
    row.className = "drive-setting-row";
    row.innerHTML = `<div><strong></strong><small></small></div><button class="small-action" ${drive.builtIn ? "disabled title=\"Drive bawaan\"" : "title=\"Hapus drive\""}>${drive.builtIn ? "Bawaan" : "Hapus"}</button>`;
    row.querySelector("strong").textContent = drive.name;
    row.querySelector("small").textContent = drive.folderId;
    if (!drive.builtIn) {
      row.querySelector("button").onclick = () => {
        const drives = getDrives().filter((_, i) => i !== index);
        saveDrives(drives);
        renderDriveButtons();
        renderDriveSettings();
        goHome();
      };
    }
    driveSettingsList.appendChild(row);
  });
}

addDriveBtn.onclick = () => {
  const name = driveNameInput.value.trim();
  const folderId = driveFolderIdInput.value.trim();
  if (!name || !folderId) {
    alert("Nama drive dan Folder ID wajib diisi.");
    return;
  }
  const drives = getDrives();
  if (drives.some(d => d.folderId === folderId)) {
    alert("Folder ID tersebut sudah terdaftar.");
    return;
  }
  drives.push({ name, folderId, builtIn: false });
  saveDrives(drives);
  driveNameInput.value = "";
  driveFolderIdInput.value = "";
  renderDriveButtons();
  renderDriveSettings();
  closeSettings();
  goHome();
};

saveSiteTitleBtn.onclick = () => {
  applySiteTitle(siteTitleInput.value);
  alert("Judul website disimpan.");
};

function applyRunningText(text, animation = "marquee-left", font = "system") {
  const value = String(text || "").trim() || "Selamat datang di Maheva Family ❤️";
  const anim = runningAnimations.includes(animation) ? animation : "marquee-left";
  const fontValue = runningFonts.includes(font) ? font : "system";

  runningTextTrack.textContent = value;
  runningTextTrack.className = `running-text-track anim-${anim} font-${fontValue}`;
  runningTextInput.value = value;
  runningAnimationSelect.value = anim;
  runningFontSelect.value = fontValue;

  safeStorageSet(RUNNING_TEXT_KEY, value);
  safeStorageSet(RUNNING_ANIMATION_KEY, anim);
  safeStorageSet(RUNNING_FONT_KEY, fontValue);
}

function restoreRunningText() {
  applyRunningText(
    safeStorageGet(RUNNING_TEXT_KEY, "Selamat datang di Maheva Family ❤️"),
    safeStorageGet(RUNNING_ANIMATION_KEY, "marquee-left"),
    safeStorageGet(RUNNING_FONT_KEY, "system")
  );
}

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

function getSocialLinks() {
  try {
    const data = JSON.parse(safeStorageGet(SOCIAL_LINKS_KEY, "{}"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function applySocialLinks() {
  const links = getSocialLinks();
  const items = [
    [socialInstagram, links.instagram],
    [socialLinkedin, links.linkedin],
    [socialYoutube, links.youtube],
    [socialFacebook, links.facebook]
  ];
  items.forEach(([el, href]) => {
    const url = normalizeUrl(href);
    el.href = url || "#";
    el.classList.toggle("is-disabled", !url);
    el.setAttribute("aria-disabled", String(!url));
    el.onclick = event => {
      if (!url) event.preventDefault();
    };
  });
}

function restoreSocialLinks() {
  const links = getSocialLinks();
  socialInstagramInput.value = links.instagram || "";
  socialLinkedinInput.value = links.linkedin || "";
  socialYoutubeInput.value = links.youtube || "";
  socialFacebookInput.value = links.facebook || "";
  applySocialLinks();
}

function showSecurityWarning() {
  const message = safeStorageGet(SECURITY_WARNING_KEY, DEFAULT_SECURITY_WARNING);
  alert(message);
}

function restoreSecurityWarning() {
  securityWarningInput.value = safeStorageGet(SECURITY_WARNING_KEY, DEFAULT_SECURITY_WARNING);
}

function openSettings() {
  siteTitleInput.value = safeStorageGet(SITE_TITLE_KEY, "Maheva Family");
  restoreSocialLinks();
  restoreSecurityWarning();
  renderDriveSettings();
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

saveRunningTextBtn.onclick = () => {
  applyRunningText(
    runningTextInput.value,
    runningAnimationSelect.value,
    runningFontSelect.value
  );
  closeSettings();
};

[runningAnimationSelect, runningFontSelect].forEach(control => {
  control.addEventListener("change", () => {
    applyRunningText(
      runningTextInput.value,
      runningAnimationSelect.value,
      runningFontSelect.value
    );
  });
});

saveSocialLinksBtn.onclick = () => {
  const links = {
    instagram: socialInstagramInput.value.trim(),
    linkedin: socialLinkedinInput.value.trim(),
    youtube: socialYoutubeInput.value.trim(),
    facebook: socialFacebookInput.value.trim()
  };
  safeStorageSet(SOCIAL_LINKS_KEY, JSON.stringify(links));
  applySocialLinks();
  alert("Link sosial media disimpan.");
};

saveSecurityWarningBtn.onclick = () => {
  const message = securityWarningInput.value.trim() || DEFAULT_SECURITY_WARNING;
  safeStorageSet(SECURITY_WARNING_KEY, message);
  securityWarningInput.value = message;
  alert("Pesan peringatan login disimpan.");
};

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
restoreRunningText();
restoreSiteTitle();
restoreSocialLinks();
restoreSecurityWarning();
renderDriveButtons();

