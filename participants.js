// participants.js
import { db } from './firebase-init.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const tableBody = document.getElementById("participants-body");
const formPopup = document.getElementById("form-popup");
const deletePopup = document.getElementById("delete-popup");
const messagePopup = document.getElementById("message-popup");
const warning = document.getElementById("form-warning");
const messageText = document.getElementById("message-text");
const messageOk = document.getElementById("message-ok");
const deleteConfirm = document.getElementById("confirm-delete");
const deleteCancel = document.getElementById("cancel-delete");
const addBtn = document.getElementById("add-btn");
const startBtn = document.getElementById("start-btn");
const closeBtn = document.getElementById("close-form");
const saveForm = document.getElementById("save-form");
const participantsSummary = document.getElementById("participants-summary");
const backBtn = document.getElementById("back-eval");
let followerCount = 0;
let leaderCount = 0;

let editingId = null;

function showMessage(msg) {
    formPopup.classList.add("hidden"); // close form popup if open
    deletePopup.classList.add("hidden"); // close delete popup if open
    messageText.textContent = msg;
    messagePopup.classList.remove("hidden");
}

messageOk.addEventListener("click", () => {
    messagePopup.classList.add("hidden");
    loadData();
});

function createRow(data) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${data.id}</td>
    <td>${data.name}</td>
    <td>${data.surname}</td>
    <td>${data.role}</td>
    <td>
      <button class="edit-btn" data-id="${data.id}"><i class="fas fa-pencil"></i> Edit</button>
      <button class="delete-btn" data-id="${data.id}"><i class="fas fa-trash"></i> Delete</button>
    </td>`;
    return tr;
}

function loadData() {
    followerCount = 0;
    leaderCount = 0;

    const listRef = ref(db, "participants");
    get(listRef).then(snapshot => {
        tableBody.innerHTML = "";
        const data = snapshot.val();
        if (!data) return;
        const sorted = Object.values(data).sort((a, b) => a.id - b.id);
        sorted.forEach(d => {
            const row = createRow(d);
            tableBody.appendChild(row);
            if (d.role === "follower") followerCount++;
            if (d.role === "leader") leaderCount++;
        });

        participantsSummary.textContent = `${followerCount} follower(s), ${leaderCount} leader(s)`;
    });

}

addBtn.addEventListener("click", () => {
    editingId = null;
    formPopup.classList.remove("hidden");
    warning.textContent = "";
    document.getElementById("input-id").value = "";
    document.getElementById("input-name").value = "";
    document.getElementById("input-surname").value = "";
    document.getElementById("input-role").value = "follower";
});

startBtn.addEventListener("click", async () => {
    if (followerCount !== leaderCount) {
        showMessage("To start the competition, the number of followers and leaders should be equal.");
        return;
    }

    await initializeCompetitionRounds();
});

// Yöneticinin butona tıklaması sonrası yarışmacılar istenilen sayıda ön eleme turuna rastgele şekilde dağıtılır
async function initializeCompetitionRounds() {
    const startRef = ref(db, 'competitionStart');
    const startSnap = await get(startRef);

    if (startSnap.exists() && startSnap.val() === true) {
        showMessage("Competition already started. Skipping initialization.");
        return;
    }

    const participantsSnap = await get(ref(db, 'participants'));
    if (!participantsSnap.exists()) {
        showMessage("No participants found.");
        return;
    }

    const participants = Object.values(participantsSnap.val());
    const followers = participants.filter(p => p.role === 'follower');
    const leaders = participants.filter(p => p.role === 'leader');

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledFollowers = shuffle([...followers]);
    const shuffledLeaders = shuffle([...leaders]);

    const roundAssignments = {
        round15: {
            followers: shuffledFollowers.splice(0, 10),
            leaders: shuffledLeaders.splice(0, 10)
        },
        round16: {
            followers: shuffledFollowers.splice(0, 10),
            leaders: shuffledLeaders.splice(0, 10)
        },
        round17: {
            followers: shuffledFollowers.splice(0, 10),
            leaders: shuffledLeaders.splice(0, 10)
        },
        round18: {
            followers: shuffledFollowers.splice(0, 10),
            leaders: shuffledLeaders.splice(0, 10)
        },
        round19: {
            followers: shuffledFollowers,
            leaders: shuffledLeaders
        }
    };

    for (const [round, data] of Object.entries(roundAssignments)) {
        const combined = [...data.followers, ...data.leaders];
        const roundRef = ref(db, `roundParticipants/${round}`);
        await set(roundRef, combined.reduce((acc, item, i) => {
            acc[i] = item;
            return acc;
        }, {}));
    }

    await set(startRef, true);
    showMessage("Participants distributed and competition started.");
}

closeBtn.addEventListener("click", () => {
    formPopup.classList.add("hidden");
});

tableBody.addEventListener("click", e => {
    if (e.target.closest(".edit-btn")) {
        const id = e.target.closest(".edit-btn").dataset.id;
        const dataRef = ref(db, `participants/${id}`);
        get(dataRef).then(snap => {
            if (!snap.exists()) return;
            const data = snap.val();
            editingId = id;
            formPopup.classList.remove("hidden");
            warning.textContent = "";
            document.getElementById("input-id").value = data.id;
            document.getElementById("input-name").value = data.name;
            document.getElementById("input-surname").value = data.surname;
            document.getElementById("input-role").value = data.role;
        });
    }

    if (e.target.closest(".delete-btn")) {
        const id = e.target.closest(".delete-btn").dataset.id;
        deletePopup.classList.remove("hidden");
        deleteConfirm.onclick = () => {
            const deleteRef = ref(db, `participants/${id}`);
            remove(deleteRef).then(() => {
                deletePopup.classList.add("hidden");
                showMessage("Record deleted successfully!");
            });
        };
        deleteCancel.onclick = () => {
            deletePopup.classList.add("hidden");
        };
    }
});

saveForm.addEventListener("click", async () => {
    const id = document.getElementById("input-id").value.trim();
    const name = document.getElementById("input-name").value.trim();
    const surname = document.getElementById("input-surname").value.trim();
    const role = document.getElementById("input-role").value;

    if (!id || !name || !surname || !role) {
        warning.textContent = "You need to fill all inputs";
        return;
    }

    const idNumber = parseInt(id);
    if (isNaN(idNumber)) {
        warning.textContent = "ID must be a number";
        return;
    }

    const idKey = idNumber.toString();
    const newData = { id: idNumber, name, surname, role };

    if (!editingId) {
        const snap = await get(ref(db, `participants`));
        if (snap.exists()) {
            const all = snap.val();
            if (all.hasOwnProperty(idKey)) {
                warning.textContent = "There is already a record. Change the id";
                return;
            }
        }
    } else {
        if (editingId !== idKey) {
            await remove(ref(db, `participants/${editingId}`));
        }
    }

    await set(ref(db, `participants/${idKey}`), newData);
    showMessage("Record saved successfully");
});

function goBack() {
    window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();
