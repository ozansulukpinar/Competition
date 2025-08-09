// reround.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersDiv = document.getElementById("followers");
const leadersDiv = document.getElementById("leaders");
const saveBtn = document.getElementById("save-eval");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupOk = document.getElementById("popup-ok");

const roundName = "round20";
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
  document.querySelector(".round-screen").classList.add("blur-background");
}

popupOk.addEventListener("click", () => {
  popup.classList.add("hidden");
  document.querySelector(".round-screen").classList.remove("blur-background");
});

function createParticipantRow(participant, group) {
  const row = document.createElement("div");
  row.className = `participant-row ${group}-row`;
  row.dataset.participantId = participant.id;
  row.dataset.group = group;

  const label = document.createElement("div");
  label.className = "participant-label";
  label.textContent = `${participant.id}`;

  const buttons = document.createElement("div");
  buttons.className = "toggle-switch";

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "switch-label inactive";
    btn.textContent = i;
    btn.dataset.rank = i;

    btn.addEventListener("click", () => {
      // Row-level clear
      const allButtons = row.querySelectorAll(".switch-label");
      allButtons.forEach(b => b.classList.remove("active"));

      // Column-level clear: remove same rank in other rows of this group
      const allRows = document.querySelectorAll(`.${group}-row`);
      allRows.forEach(r => {
        if (r !== row) {
          const b = r.querySelector(`.switch-label[data-rank='${i}']`);
          if (b) b.classList.remove("active");
          const id = r.dataset.participantId;
          if (selections[id] && selections[id] == i) delete selections[id];
        }
      });

      // Save this selection
      selections[participant.id] = i;
      btn.classList.add("active");
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
  const rankSet = new Set();
  const usedIds = new Set(Object.keys(selections));

  Object.values(selections).forEach(rank => rankSet.add(rank));

  rows.forEach(row => {
    const id = row.dataset.participantId;
    const buttons = row.querySelectorAll(".switch-label");

    buttons.forEach(btn => {
      const rank = btn.dataset.rank;
      btn.classList.remove("active", "dimmed", "inactive");

      if (selections[id] && selections[id].toString() === rank) {
        btn.classList.add("active");
      } else if (rankSet.has(rank) || usedIds.has(id)) {
        btn.classList.add("dimmed");
      } else {
        btn.classList.add("inactive");
      }
    });
  });
}

function checkEnableSave() {
  const followerIds = Array.from(document.querySelectorAll(".follower-row")).map(r => r.dataset.participantId);
  const leaderIds = Array.from(document.querySelectorAll(".leader-row")).map(r => r.dataset.participantId);

  const followerRanks = new Set();
  const leaderRanks = new Set();
  let valid = true;

  for (let id of followerIds) {
    const rank = selections[id];
    if (!rank || followerRanks.has(rank)) {
      valid = false;
      break;
    }
    followerRanks.add(rank);
  }
  for (let id of leaderIds) {
    const rank = selections[id];
    if (!rank || leaderRanks.has(rank)) {
      valid = false;
      break;
    }
    leaderRanks.add(rank);
  }

  saveBtn.disabled = !valid;
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
    Object.values(participants)
      .sort((a, b) => a.id - b.id)
      .forEach(p => {
        const row = createParticipantRow(p, p.role);
        if (p.role === "follower") followersDiv.appendChild(row);
        else leadersDiv.appendChild(row);
      });
    checkEnableSave();
  }).catch(err => console.log(err.message));
}

saveBtn.addEventListener("click", () => {
  const saveRef = ref(db, `roundResults/reround/${currentUser}`);
  const dataToSave = Object.entries(selections).map(([id, rank]) => ({
    jury: currentUser,
    participantId: id,
    rank: rank
  }));

  set(saveRef, dataToSave).then(() => {
    const progressRef = ref(db, `juryProgress/${currentUser}`);
    set(progressRef, "end").then(() => {
      saveBtn.disabled = true;
      showPopup("Re-Round is completed. Thank you.");
      window.location.href = "jury-dashboard.html";
    });
  });
});

loadParticipants();
