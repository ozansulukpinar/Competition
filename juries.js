// juries.js
import { db } from './firebase-init.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const tableBody = document.getElementById("juryTableBody");
const addBtn = document.getElementById("addBtn");
const formPopup = document.getElementById("formPopup");
const confirmPopup = document.getElementById("confirmPopup");
const infoPopup = document.getElementById("infoPopup");
const formClose = document.getElementById("formClose");
const infoClose = document.getElementById("infoClose");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const infoMessage = document.getElementById("infoMessage");
const juryForm = document.getElementById("juryForm");
const juryId = document.getElementById("juryId");
const juryUsername = document.getElementById("juryUsername");
const juryProgress = document.getElementById("juryProgress");
const formWarning = document.getElementById("formWarning");
const backBtn = document.getElementById("back-eval");

let currentEditUsername = null;
let currentEditId = null;
let deleteTargetUsername = null;
let deleteTargetId = null;

function showPopup(popup) {
    popup.classList.remove("hidden");
}
function hidePopup(popup) {
    popup.classList.add("hidden");
}
function showMessage(msg) {
    infoMessage.textContent = msg;
    showPopup(infoPopup);
}

infoClose.addEventListener("click", () => hidePopup(infoPopup));
formClose.addEventListener("click", () => hidePopup(formPopup));
cancelDeleteBtn.addEventListener("click", () => hidePopup(confirmPopup));

addBtn.addEventListener("click", () => {
    currentEditUsername = null;
    juryForm.reset();
    formWarning.classList.add("hidden");
    showPopup(formPopup);
});

juryForm.addEventListener("submit", async e => {
    e.preventDefault();
    formWarning.classList.add("hidden");

    const id = juryId.value.trim();
    const username = juryUsername.value.trim();
    const progress = juryProgress.value;

    if (!id || !username || !progress) {
        formWarning.textContent = "You need to fill all inputs";
        formWarning.classList.remove("hidden");
        return;
    }

    const usersRef = ref(db, "users");
    const juryProgressRef = ref(db, `juryProgress/${username}`);
    const usersSnap = await get(usersRef);
    const users = usersSnap.exists() ? usersSnap.val() : {};

    if (Object.values(users).some(u => u.id == id) && id != currentEditId) {
        formWarning.textContent = "There is already a record. Change the id";
        formWarning.classList.remove("hidden");
        return;
    }

    const newData = {
        id: parseInt(id),
        username: username,
        role: "jury"
    };

    if (currentEditUsername) {
        // Eski kaydı sil
        await Promise.all([
            remove(ref(db, `users/${currentEditId}`)),
            remove(ref(db, `juryProgress/${currentEditUsername}`))
        ]);
    }

    await Promise.all([
        set(ref(db, `users/${id}`), newData),
        set(juryProgressRef, progress)
    ]);

    hidePopup(formPopup);
    showMessage("Record saved succesffully");
    loadData();
});

confirmDeleteBtn.addEventListener("click", async () => {
    if (!deleteTargetUsername) return;
    await Promise.all([
        remove(ref(db, `users/${deleteTargetId}`)),
        remove(ref(db, `juryProgress/${deleteTargetUsername}`))
    ]);
    hidePopup(confirmPopup);
    showMessage("Record deleted successfully!");
    loadData();
});

function buildRow(user, progress) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${user.id}</td>
    <td>${user.username}</td>
    <td>${progress}</td>
    <td>
      <button class="action-btn edit-btn"><i class="fas fa-pencil"></i> Edit</button>
      <button class="action-btn delete-btn"><i class="fas fa-trash"></i> Delete</button>
    </td>
  `;

    const [editBtn, deleteBtn] = tr.querySelectorAll("button");

    editBtn.addEventListener("click", () => {
        currentEditUsername = user.username;
        currentEditId = user.id;
        juryId.value = user.id;
        juryUsername.value = user.username;
        juryProgress.value = progress;
        formWarning.classList.add("hidden");
        showPopup(formPopup);
    });

    deleteBtn.addEventListener("click", () => {
        deleteTargetUsername = user.username;
        deleteTargetId = user.id;
        showPopup(confirmPopup);
    });

    return tr;
}

async function loadData() {
    tableBody.innerHTML = "";
    const [usersSnap, progressSnap] = await Promise.all([
        get(ref(db, "users")),
        get(ref(db, "juryProgress"))
    ]);

    if (!usersSnap.exists()) return;

    const users = Object.values(usersSnap.val())
        .filter(u => u.role === "jury")
        .sort((a, b) => a.id - b.id);

    const progressData = progressSnap.exists() ? progressSnap.val() : {};

    users.forEach(user => {
        const progress = progressData[user.username] || "-";
        const row = buildRow(user, progress);
        tableBody.appendChild(row);
    });
}

function goBack() {
    window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();
