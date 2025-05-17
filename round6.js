// round6.js
import { db } from './firebase-init.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersDiv = document.getElementById("followers");
const leadersDiv = document.getElementById("leaders");
const saveBtn = document.getElementById("save-eval");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

const roundName = "round6";
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

function getNextRoundName(currentName) {
  const match = currentName.match(/^(.*?)(\d+)$/);
  if (!match) return currentName;
  const prefix = match[1];
  const number = parseInt(match[2]);
  return prefix + (number + 1);
}

// Yarı finallerdeki en iyi 6 follower ve 6 leader finale seçilir
async function generateFinalistsIfReady() {
  try {
    const [usersSnap, progressSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'juryProgress'))
    ]);

    if (!usersSnap.exists() || !progressSnap.exists()) return;
    const users = Object.values(usersSnap.val()).filter(u => u.role === 'jury');
    const progress = progressSnap.val();

    const allDone = users.every(u => progress[u.username] === 'round7');
    if (!allDone) return;

    const [r5, r6, participantsSnap] = await Promise.all([
      get(ref(db, 'roundResults/round5')),
      get(ref(db, 'roundResults/round6')),
      get(ref(db, 'participants'))
    ]);

    if (!r5.exists() || !r6.exists() || !participantsSnap.exists()) return;

    const participants = Object.values(participantsSnap.val());
    const allResults = [r5.val(), r6.val()];
    const scores = {};

    allResults.forEach(result => {
      Object.values(result).forEach(evals => {
        evals.forEach(({ participantId, pass }) => {
          if (!scores[participantId]) scores[participantId] = 0;
          if (pass) scores[participantId]++;
        });
      });
    });

    const enriched = participants.map(p => ({ ...p, score: scores[p.id] || 0 }));
    const topFollowers = enriched.filter(p => p.role === 'follower')
                                 .sort((a, b) => b.score - a.score)
                                 .slice(0, 6);
    const topLeaders = enriched.filter(p => p.role === 'leader')
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 6);

    const round7 = [...topFollowers, ...topLeaders];
    await set(ref(db, 'roundParticipants/round7'), round7.reduce((acc, val, i) => {
      acc[i] = val;
      return acc;
    }, {}));
  } catch (err) {
    console.error(err);
    showPopup("Error during save finalists.");
  }
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
    get(progressRef).then(async snap => {
      const current = snap.exists() ? snap.val() : 0;
      const nextRoundName = getNextRoundName(roundName);
      await set(progressRef, nextRoundName).then(async () => {
        await generateFinalistsIfReady();
        saveBtn.disabled = true;
        window.location.href = "jury-dashboard.html";
      });
    });
  });
});

loadParticipants();
