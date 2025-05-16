// round1.js
import { db } from './firebase-init.js';
import {
  ref,
  get,
  set,
  push,
  child,
  update
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersDiv = document.getElementById("followers");
const leadersDiv = document.getElementById("leaders");
const saveBtn = document.getElementById("save-eval");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

const roundName = "round1";
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

let evaluations = {}; // key: participantId, value: true/false

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

  // Başlangıç durumu
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
    if (!snapshot.exists()) return showPopup("Participants not found.");

    const participants = snapshot.val();
    Object.values(participants).forEach(p => {
      const row = createParticipantRow(p);
      if (p.role === "follower") followersDiv.appendChild(row);
      else leadersDiv.appendChild(row);
    });
  }).catch(err => {
    console.error(err);
    showPopup("Error during read the data.");
  });
}

saveBtn.addEventListener("click", async () => {
  try{
      const saveRef = ref(db, `roundResults/${roundName}/${currentUser}`);
      const dataToSave = Object.entries(evaluations).map(([id, pass]) => ({
        jury: currentUser,
        participantId: id,
        pass: pass
      }));
      // Jüri ilerleme seviyesini artır
      const progressRef = ref(db, `juryProgress/${currentUser}`);
      let roundKey = roundName.replace("1", "2");
      await set(progressRef, roundKey);
      saveBtn.disabled = true;
      window.location.href = "jury-dashboard.html";
  }
  catch (e) {
    console.log("Hata:", e);
    showPopup("Error during write the data.");
  }
});

loadParticipants();
