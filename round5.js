// round5.js
import { db } from './firebase-init.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersDiv = document.getElementById("followers");
const leadersDiv = document.getElementById("leaders");
const saveBtn = document.getElementById("save-eval");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

const roundName = "round5";
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

let evaluations = {};

function showPopup(msg) {
  popupMessage.textContent = msg;
  popup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

function createParticipantRow(participant) {
  const row = document.createElement("div");
  row.className = "participant-row";

  const label = document.createElement("div");
  label.className = "participant-label";
  label.textContent = `${participant.id} - ${participant.name} ${participant.surname}`;

  const toggle = document.createElement("div");
  toggle.className = "toggle-switch";

  const switchLabel = document.createElement("div");
  switchLabel.className = "switch-label";
  switchLabel.textContent = "No";

  switchLabel.dataset.state = "no";
  switchLabel.addEventListener("click", () => {
    if (switchLabel.dataset.state === "no") {
      switchLabel.dataset.state = "yes";
      switchLabel.classList.add("active");
      switchLabel.textContent = "Yes";
      evaluations[participant.id] = true;
    } else {
      switchLabel.dataset.state = "no";
      switchLabel.classList.remove("active");
      switchLabel.textContent = "No";
      evaluations[participant.id] = false;
    }
    //checkEnableSave();
  });

  evaluations[participant.id] = false;
  toggle.appendChild(switchLabel);
  row.appendChild(label);
  row.appendChild(toggle);

  return row;
}

function checkEnableSave() {
  saveBtn.disabled = Object.keys(evaluations).length === 0;
}

function loadParticipants() {
  const listRef = ref(db, `roundParticipants/${roundName}`);
  get(listRef).then(snapshot => {
    if (!snapshot.exists()) { 
      showPopup("Other juries did not complete their evaluation. Please try again later.");
      setTimeout(function() {
          window.location.href = "jury-dashboard.html";
      }, 1500);
    }
    const participants = snapshot.val();
    Object.values(participants).forEach(p => {
      const row = createParticipantRow(p);
      if (p.role === "follower") followersDiv.appendChild(row);
      else leadersDiv.appendChild(row);
    });
  }).catch(err => {
    console.log(err.message);
  });
}

function getNextRoundName(currentName) {
  const match = currentName.match(/^(.*?)(\d+)$/);
  if (!match) return currentName;
  const prefix = match[1];
  const number = parseInt(match[2]);
  return prefix + (number + 1);
}

saveBtn.addEventListener("click", () => {
  const saveRef = ref(db, `roundResults/${roundName}/${currentUser}`);
  const dataToSave = Object.entries(evaluations).map(([id, pass]) => ({
    jury: currentUser,
    participantId: id,
    pass: pass
  }));

  set(saveRef, dataToSave).then(() => {
    const progressRef = ref(db, `juryProgress/${currentUser}`);
    get(progressRef).then(snap => {
      const current = snap.exists() ? snap.val() : 0;
      const nextRoundName = getNextRoundName(roundName);
      set(progressRef, nextRoundName).then(() => {
        saveBtn.disabled = true;
        window.location.href = "jury-dashboard.html";
      });
    });
  });
});

loadParticipants();
