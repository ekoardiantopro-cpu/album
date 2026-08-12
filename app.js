const ROOT_FOLDER_ID = window.ROOT_FOLDER_ID || "root";

let allFiles = [];
let currentFolder = ROOT_FOLDER_ID;

gapi.load("client", () => {
  gapi.client.init({
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
  });
});

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("login").style.display = "none";
      document.getElementById("app").style.display = "block";
      loadFiles(ROOT_FOLDER_ID);
    })
    .catch(() => {
      const err = document.getElementById("errorMsg");
      err.innerText = "Email atau password salah!";
      err.style.display = "block";
    });
}

window.login = login;

document.getElementById("password").addEventListener("keypress", function(e) {
  if (e.key === "Enter") login();
});

document.getElementById("homeBtn").onclick = () => {
  loadFiles(ROOT_FOLDER_ID);
};

function loadFiles(folderId) {
  currentFolder = folderId;

  gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType)"
  }).then(res => {
    allFiles = res.result.files || [];
    renderFiles(allFiles);
  });
}

function renderFiles(files) {
  const container = document.getElementById("fileContainer");
  container.innerHTML = "";

  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerText = file.name;

    div.onclick = () => {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        loadFiles(file.id);
      } else {
        openFile(file.id, file.mimeType);
      }
    };

    container.appendChild(div);
  });
}

document.getElementById("searchInput").addEventListener("input", function () {
  const keyword = this.value.toLowerCase();

  const filtered = allFiles.filter(f =>
    f.name.toLowerCase().includes(keyword)
  );

  renderFiles(filtered);
});

function openFile(fileId, mimeType) {
  const viewer = document.getElementById("viewer");

  if (mimeType.includes("video")) {
    viewer.innerHTML = `
      <video controls width="100%">
        <source src="https://drive.google.com/uc?export=download&id=${fileId}">
      </video>`;
  } 
  else if (mimeType.includes("pdf")) {
    viewer.innerHTML = `
      <iframe src="https://drive.google.com/file/d/${fileId}/preview"
      width="100%" height="500px"></iframe>`;
  } 
  else if (mimeType.includes("image")) {
    viewer.innerHTML = `
      <img src="https://drive.google.com/uc?id=${fileId}" width="100%">`;
  } 
  else {
    viewer.innerHTML = `
      <iframe src="https://drive.google.com/file/d/${fileId}/preview"
      width="100%" height="500px"></iframe>`;
  }
}
