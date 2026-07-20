let historyStack = [];

// LOAD FOLDER
window.loadFolder = async (folderId) => {
  historyStack.push(folderId);

  document.getElementById("backBtn").style.display =
    historyStack.length > 1 ? "block" : "none";

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${API_KEY}`
  );

  const data = await res.json();
  const grid = document.getElementById("fileGrid");
  grid.innerHTML = "";

  data.files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file";

    const isFolder = file.mimeType === "application/vnd.google-apps.folder";

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
};

// BACK BUTTON
window.goBack = () => {
  historyStack.pop();
  const prev = historyStack.pop();
  if (prev) loadFolder(prev);
};

// =======================
// 📄 VIEWER (NO TAB BARU)
// =======================
window.openViewer = (fileId) => {
  document.getElementById("viewer").style.display = "block";

  document.getElementById("viewerFrame").src =
    `https://drive.google.com/file/d/${fileId}/preview`;
};

window.closeViewer = () => {
  document.getElementById("viewer").style.display = "none";
  document.getElementById("viewerFrame").src = "";
};
