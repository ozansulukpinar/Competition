// round7.js (Final değerlendirmesi - sıralama için 1-4 arası seçim yapılır)
import { db } from './firebase-init.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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
  row.className = "participant-row";

  const label = document.createElement("div");
  label.className = "participant-label";
  label.textContent = `${participant.id} - ${participant.name} ${participant.surname}`;

  const buttons = document.createElement("div");
  buttons.className = "toggle-switch";

  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement("button");
    btn.className = "switch-label";
    btn.textContent = i;

    btn.addEventListener("click", () => {
      // Clear previous selection
      document.querySelectorAll(`.${group}-rank-${i}`).forEach(b => {
        if (b !== btn) b.disabled = true;
      });

      // Enable other choices in same group
      document.querySelectorAll(`.${group}-row`).forEach(r => {
        if (r !== row) {
          const target = r.querySelector(`.switch-label:nth-child(${i})`);
          if (target) target.disabled = true;
        }
      });

      // Reset all buttons
      buttons.querySelectorAll(".switch-label").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      selections[participant.id] = i;
      //checkEnableSave();
    });

    btn.classList.add(`${group}-rank-${i}`);
    buttons.appendChild(btn);
  }

  row.classList.add(`${group}-row`);
  row.appendChild(label);
  row.appendChild(buttons);
  return row;
}

function checkEnableSave() {
  saveBtn.disabled = Object.keys(selections).length < 8;
}

function loadParticipants() {
  const listRef = ref(db, `roundParticipants/${roundName}`);
  get(listRef).then(snapshot => {
    if (!snapshot.exists()) {
      showPopup("Other juries did not complete their evaluation. Please try again later.");
      setTimeout(function() {
          window.location.href = "jury-dashboard.html";
      }, 2500);
    }
    const participants = snapshot.val();
    Object.values(participants).forEach(p => {
      const row = createParticipantRow(p, p.role);
      if (p.role === "follower") followersDiv.appendChild(row);
      else leadersDiv.appendChild(row);
    });
  }).catch(err => {
    if(err){
      console.error(err);
      showPopup("Error during read the data.");
    }
  });
}

saveBtn.addEventListener("click", () => {
  const saveRef = ref(db, `roundResults/${roundName}/${currentUser}`);
  const dataToSave = Object.entries(selections).map(([id, rank]) => ({
    jury: currentUser,
    participantId: id,
    rank: rank
  }));

  set(saveRef, dataToSave).then(() => {
    const progressRef = ref(db, `juryProgress/${currentUser}`);
    get(progressRef).then(snap => {
      const current = snap.exists() ? snap.val() : 0;
      set(progressRef, "end").then(() => {
        saveBtn.disabled = true;
        showPopup("Competition is completed. Thank you.");
        window.location.href = "jury-dashboard.html";
      });
    });
  });
});

loadParticipants();
