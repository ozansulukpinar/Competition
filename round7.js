// Güncellenmiş round7.js – satır ve sütun kısıtlamalarıyla
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
  row.dataset.participantId = participant.id;
  row.dataset.group = group;

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
      // Aynı gruptaki satır ve sütunu temizle
      const groupRows = document.querySelectorAll(`.${group}-row`);
      groupRows.forEach(r => {
        const pid = r.dataset.participantId;
        const cellBtns = r.querySelectorAll(".switch-label");

        // Aynı satırın tüm butonlarını pasifleştir
        if (r === row) {
          cellBtns.forEach(b => b.classList.remove("active"));
        }

        // Aynı sütundaki diğer satırların butonlarını devre dışı bırak
        cellBtns.forEach(b => {
          if (b.dataset.rank === btn.dataset.rank && r !== row) {
            b.classList.remove("active");
          }
        });
      });

      // Yeni seçim ata
      selections[participant.id] = parseInt(btn.textContent);
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
  const selectedRanks = {};
  const selectedParticipants = new Set(Object.keys(selections));

  Object.entries(selections).forEach(([pid, rank]) => {
    const el = document.querySelector(`.${group}-row[data-participant-id='${pid}']`);
    if (el) {
      selectedRanks[rank] = true;
    }
  });

  rows.forEach(row => {
    const id = row.dataset.participantId;
    const buttons = row.querySelectorAll(".switch-label");

    buttons.forEach(btn => {
      const rank = btn.dataset.rank;
      btn.classList.remove("active", "dimmed", "inactive");

      if (selections[id] && selections[id].toString() === rank) {
        btn.classList.add("active");
      } else if (selectedRanks[rank] || selectedParticipants.has(id)) {
        btn.classList.add("dimmed");
      } else {
        btn.classList.add("inactive");
      }
    });
  });
}

function checkEnableSave() {
  const followerRanks = new Set();
  const leaderRanks = new Set();
  const followerIds = new Set();
  const leaderIds = new Set();

  Object.entries(selections).forEach(([id, rank]) => {
    const isFollower = !!document.querySelector(`.follower-row[data-participant-id='${id}']`);
    if (isFollower) {
      followerRanks.add(rank);
      followerIds.add(id);
    } else {
      leaderRanks.add(rank);
      leaderIds.add(id);
    }
  });

  const validFollowers = followerRanks.size === 6 && followerIds.size === 6;
  const validLeaders = leaderRanks.size === 6 && leaderIds.size === 6;

  saveBtn.disabled = !(validFollowers && validLeaders);
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
  const followerRanks = {}, leaderRanks = {};
  const followerIDs = [], leaderIDs = [];

  Object.entries(selections).forEach(([id, rank]) => {
    const isFollower = !!document.querySelector(`.follower-row[data-participant-id='${id}']`);
    const group = isFollower ? "follower" : "leader";

    if (group === "follower") {
      followerRanks[rank] = (followerRanks[rank] || 0) + 1;
      followerIDs.push(id);
    } else {
      leaderRanks[rank] = (leaderRanks[rank] || 0) + 1;
      leaderIDs.push(id);
    }
  });

  const validFollowers = followerIDs.length === 6 && Object.values(followerRanks).every(v => v === 1);
  const validLeaders = leaderIDs.length === 6 && Object.values(leaderRanks).every(v => v === 1);

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
