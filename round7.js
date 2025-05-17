// round7.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersDiv = document.getElementById("followers");
const leadersDiv = document.getElementById("leaders");
const saveBtn = document.getElementById("save-eval");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

const roundName = "round7";
let currentUser = window.sessionStorage.getItem("username");
let selections = {};

await authenticationControl();

async function authenticationControl() {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  const users = snapshot.val();
  const user = Object.values(users).find(u => u.username === currentUser);
  if (!user) {
    window.location.href = "index.html";
  }
}

function showPopup(msg) {
  popupMessage.textContent = msg;
  popup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => popup.classList.add("hidden"));

function createParticipantRow(participant, group) {
  const row = document.createElement("div");
  row.className = `participant-row ${group}-row`;

  const label = document.createElement("div");
  label.className = "participant-label";
  label.textContent = `${participant.id} - ${participant.name} ${participant.surname}`;

  const buttons = document.createElement("div");
  buttons.className = "toggle-switch";

  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement("button");
    btn.className = "switch-label inactive";
    btn.textContent = i;
    btn.dataset.rank = i;

    btn.addEventListener("click", () => {
      // Bu satırdaki tüm butonları temizle
      buttons.querySelectorAll(".switch-label").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Seçimi güncelle
      selections[participant.id] = i;
      updateVisualFeedback(group);
      checkEnableSave();
    });

    buttons.appendChild(btn);
  }

  row.appendChild(label);
  row.appendChild(buttons);
  return row;
}

function updateVisualFeedback(group) {
  const rows = document.querySelectorAll(`.${group}-row`);
  const selectedRanks = {};
  const selectedRows = {};

  rows.forEach(row => {
    const id = row.querySelector(".participant-label").textContent.split(" - ")[0];
    const rank = selections[id];
    if (rank) {
      selectedRanks[rank] = true;
      selectedRows[id] = true;
    }
  });

  rows.forEach(row => {
    const id = row.querySelector(".participant-label").textContent.split(" - ")[0];
    const buttons = row.querySelectorAll(".switch-label");

    buttons.forEach(btn => {
      btn.classList.remove("active", "dimmed", "inactive");

      const rank = btn.textContent;
      if (selections[id] && selections[id].toString() === rank) {
        btn.classList.add("active");
      } else if (selectedRanks[rank] || selectedRows[id]) {
        btn.classList.add("dimmed");
      } else {
        btn.classList.add("inactive");
      }
    });
  });
}

function checkEnableSave() {
  const allRanks = Object.values(selections);
  const uniqueRanks = new Set(allRanks);
  saveBtn.disabled = allRanks.length !== 12 || uniqueRanks.size < 6;
}

function loadParticipants() {
  const listRef = ref(db, `roundParticipants/${roundName}`);
  get(listRef).then(snapshot => {
    if (!snapshot.exists()) {
      showPopup("Other juries did not complete their evaluation. Please try again later.");
      setTimeout(() => window.location.href = "jury-dashboard.html", 1500);
      return;
    }
    const participants = snapshot.val();
    Object.values(participants).forEach(p => {
      const row = createParticipantRow(p, p.role);
      if (p.role === "follower") followersDiv.appendChild(row);
      else leadersDiv.appendChild(row);
    });
  }).catch(err => console.log(err.message));
}

saveBtn.addEventListener("click", () => {
  const groupRanks = { follower: {}, leader: {} };
  const groupCounts = { follower: 0, leader: 0 };

  Object.entries(selections).forEach(([id, rank]) => {
    const el = document.querySelector(`.participant-label:contains('${id}')`);
    const group = followersDiv.innerHTML.includes(id) ? "follower" : "leader";

    groupRanks[group][rank] = (groupRanks[group][rank] || 0) + 1;
    groupCounts[group]++;
  });

  const validFollowers = groupCounts.follower === 6 && Object.values(groupRanks.follower).every(v => v === 1);
  const validLeaders = groupCounts.leader === 6 && Object.values(groupRanks.leader).every(v => v === 1);

  if (!validFollowers) return showPopup("Please check your rankings for the Followers group.");
  if (!validLeaders) return showPopup("Please check your rankings for the Leaders group.");

  const saveRef = ref(db, `roundResults/${roundName}/${currentUser}`);
  const dataToSave = Object.entries(selections).map(([id, rank]) => ({
    jury: currentUser,
    participantId: id,
    rank: rank
  }));

  set(saveRef, dataToSave).then(() => {
    const progressRef = ref(db, `juryProgress/${currentUser}`);
    set(progressRef, "end").then(() => {
      saveBtn.disabled = true;
      showPopup("Competition is completed. Thank you.");
      window.location.href = "jury-dashboard.html";
    });
  });
});

loadParticipants();
