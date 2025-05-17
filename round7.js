// round7.js (Final değerlendirmesi - sıralama için 1-6 arası seçim yapılır)
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

let selections = {};

function showPopup(msg) {
  popupMessage.textContent = msg;
  popup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

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
    btn.className = "switch-label";
    btn.textContent = i;
    btn.dataset.rank = i;

    btn.addEventListener("click", () => {
      // Aynı satırda önceki seçimi kaldır
      buttons.querySelectorAll(".switch-label").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Seçimi kaydet
      selections[participant.id] = i;

      // Güncel stil işlemleri
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
      const btnRank = btn.textContent;

      if (btn.classList.contains("active")) {
        btn.style.backgroundColor = "green";
        btn.style.color = "white";
      } else if (selectedRanks[btnRank] || selectedRows[id]) {
        btn.style.backgroundColor = "#444";
        btn.style.color = "white";
      } else {
        btn.style.backgroundColor = "red";
        btn.style.color = "white";
      }
    });
  });
}

function checkEnableSave() {
  const followerRanks = {};
  const leaderRanks = {};
  let followerCount = 0;
  let leaderCount = 0;

  for (const [id, rank] of Object.entries(selections)) {
    const el = document.querySelector(`[data-id='${id}']`) || {};
    const group = id in followersDiv.innerHTML ? "follower" : "leader";
    if (group === "follower") {
      followerRanks[rank] = (followerRanks[rank] || 0) + 1;
      followerCount++;
    } else {
      leaderRanks[rank] = (leaderRanks[rank] || 0) + 1;
      leaderCount++;
    }
  }

  const validFollowers = followerCount === 6 && Object.values(followerRanks).every(v => v === 1);
  const validLeaders = leaderCount === 6 && Object.values(leaderRanks).every(v => v === 1);

  saveBtn.disabled = !(validFollowers && validLeaders);
}

function loadParticipants() {
  const listRef = ref(db, `roundParticipants/${roundName}`);
  get(listRef).then(snapshot => {
    if (!snapshot.exists()) {
      showPopup("Other juries did not complete their evaluation. Please try again later.");
      setTimeout(function () {
        window.location.href = "jury-dashboard.html";
      }, 1500);
      return;
    }

    const participants = snapshot.val();
    Object.values(participants).forEach(p => {
      const row = createParticipantRow(p, p.role);
      if (p.role === "follower") followersDiv.appendChild(row);
      else leadersDiv.appendChild(row);
    });
  }).catch(err => {
    console.log(err.message);
  });
}

saveBtn.addEventListener("click", () => {
  const followerRanks = {}, leaderRanks = {};
  const followerIDs = [], leaderIDs = [];

  Object.entries(selections).forEach(([id, rank]) => {
    const isFollower = !!document.querySelector(`.follower-row .participant-label:contains('${id}')`);
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
