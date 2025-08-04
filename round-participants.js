// round-participants.js
import { db } from './firebase-init.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const formPopup = document.getElementById("formPopup");
const formClose = document.getElementById("formClose");
const participantForm = document.getElementById("participantForm");
const participantId = document.getElementById("participantId");
const participantRole = document.getElementById("participantRole");
const formWarning = document.getElementById("formWarning");

const confirmPopup = document.getElementById("confirmPopup");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const infoPopup = document.getElementById("infoPopup");
const infoClose = document.getElementById("infoClose");
const infoMessage = document.getElementById("infoMessage");
const tableSections = document.getElementById("table-sections");
const backBtn = document.getElementById("back-eval");

let selectedRound = null;
let selectedId = null;

const roundStructure = [
    { title: "Preliminary I.", rounds: ["round15", "round16", "round17", "round18", "round19"] },
    { title: "Preliminary II.", rounds: ["round11", "round12", "round13", "round14"] },
    { title: "Preliminary III.", rounds: ["round8", "round9", "round10"] },
    { title: "Quarter-Finals", rounds: ["round1", "round2", "round3", "round4"] },
    { title: "Semi-Finals", rounds: ["round5", "round6"] },
    { title: "Final", rounds: ["round7"] }
];

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

formClose.addEventListener("click", () => hidePopup(formPopup));
infoClose.addEventListener("click", () => hidePopup(infoPopup));
cancelDeleteBtn.addEventListener("click", () => hidePopup(confirmPopup));

participantForm.addEventListener("submit", async e => {
    e.preventDefault();
    formWarning.classList.add("hidden");
    const id = participantId.value.trim();
    const role = participantRole.value;

    if (!id || !role || !selectedRound) {
        formWarning.textContent = "You need to fill the inputs";
        formWarning.classList.remove("hidden");
        return;
    }

    const roundRef = ref(db, `roundParticipants/${selectedRound}`);
    const snap = await get(roundRef);
    const data = snap.exists() ? snap.val() : {};
    const newIndex = Object.keys(data).length.toString();

    // Determine group for selectedRound
    const group = roundStructure.find(g => g.rounds.includes(selectedRound));
    if (!group) return;

    // Check all rounds in same group for duplicate ID
    for (const round of group.rounds) {
        const snap = await get(ref(db, `roundParticipants/${round}`));
        if (!snap.exists()) continue;
        const entries = Object.values(snap.val());
        if (entries.some(p => p.id == id)) {
            showMessage("This id is already registered on this stage. Check it!");
            return;
        }
    }

    await set(ref(db, `roundParticipants/${selectedRound}/${newIndex}`), {
        id: parseInt(id),
        role: role
    });

    hidePopup(formPopup);
    showMessage("Record saved successfully!");
    loadData();
});

confirmDeleteBtn.addEventListener("click", async () => {
    if (!selectedRound || selectedId === null) return;
    const roundRef = ref(db, `roundParticipants/${selectedRound}`);
    const snap = await get(roundRef);
    const data = snap.exists() ? snap.val() : {};
    const newData = {};
    let idx = 0;
    Object.values(data).forEach(p => {
        if (p.id !== selectedId) {
            newData[idx++] = p;
        }
    });
    await set(roundRef, newData);
    hidePopup(confirmPopup);
    showMessage("Record deleted successfully!");
    loadData();
});

function buildCell(participant, roundName) {
    const div = document.createElement("div");
    div.className = "participant-cell";
    div.innerHTML = `${participant.id} <button class="delete-btn"><i class="fas fa-close"></i></button>`;
    const btn = div.querySelector(".delete-btn");
    btn.addEventListener("click", () => {
        selectedRound = roundName;
        selectedId = participant.id;
        showPopup(confirmPopup);
    });
    return div;
}

function buildTable(roundName, data) {
    const wrapper = document.createElement("div");
    wrapper.className = "round-table";

    const header = document.createElement("div");
    header.className = "round-header";
    header.innerHTML = `<span class="round-name">${roundName}</span><button class="add-btn"><i class="fas fa-plus"></i></button>`;

    const followerCol = document.createElement("div");
    const leaderCol = document.createElement("div");

    const followerTitle = document.createElement("div");
    const leaderTitle = document.createElement("div");
    followerTitle.textContent = "follower(s)";
    leaderTitle.textContent = "leader(s)";
    followerTitle.style.fontWeight = leaderTitle.style.fontWeight = "bold";

    followerCol.appendChild(followerTitle);
    leaderCol.appendChild(leaderTitle);

    Object.values(data).sort((a, b) => a.id - b.id).forEach(p => {
        const cell = buildCell(p, roundName);
        if (p.role === "follower") followerCol.appendChild(cell);
        else if (p.role === "leader") leaderCol.appendChild(cell);
    });

    const columnsWrapper = document.createElement("div");
    columnsWrapper.className = "table-columns";

    columnsWrapper.appendChild(followerCol);
    columnsWrapper.appendChild(leaderCol);

    wrapper.appendChild(header);
    wrapper.appendChild(columnsWrapper);

    header.querySelector(".add-btn").addEventListener("click", () => {
        selectedRound = roundName;
        participantForm.reset();
        formWarning.classList.add("hidden");
        showPopup(formPopup);
    });

    return wrapper;
}

async function loadData() {
    tableSections.innerHTML = "";
    for (const group of roundStructure) {
        const section = document.createElement("div");
        section.className = "section";

        const title = document.createElement("div");
        title.className = "section-title";
        title.textContent = group.title;

        const row = document.createElement("div");
        row.className = "table-row";

        const roundSnaps = await Promise.all(group.rounds.map(r => get(ref(db, `roundParticipants/${r}`))));

        roundSnaps.forEach((snap, idx) => {
            if (snap.exists()) {
                const table = buildTable(group.rounds[idx], snap.val());
                row.appendChild(table);
            }
        });

        section.appendChild(title);
        section.appendChild(row);
        tableSections.appendChild(section);
    }
}

function goBack() {
    window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();