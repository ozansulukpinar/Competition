// round4.js
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

const roundName = "round4";
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

// Çeyrek finallerdeki en iyi 10 follower ve  10 leader rastgele olarak round5 ve round6'ya dağıtılır
async function generateSemiFinalistsIfReady() {
  try {
    const [usersSnap, progressSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'juryProgress'))
    ]);

    if (!usersSnap.exists() || !progressSnap.exists()) return;
    const users = Object.values(usersSnap.val()).filter(u => u.role === 'jury');
    const progress = progressSnap.val();

    const allDone = users.every(u => progress[u.username] === 'round5');
    if (!allDone) return;

    const [r1, r2, r3, r4, participantsSnap] = await Promise.all([
      get(ref(db, 'roundResults/round1')),
      get(ref(db, 'roundResults/round2')),
      get(ref(db, 'roundResults/round3')),
      get(ref(db, 'roundResults/round4')),
      get(ref(db, 'participants'))
    ]);

    if (!r1.exists() || !r2.exists() || !r3.exists() || !r4.exists() || !participantsSnap.exists()) return;

    const participants = Object.values(participantsSnap.val());
    const allResults = [r1.val(), r2.val(), r3.val(), r4.val()];
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
                                 .slice(0, 10);
    const topLeaders = enriched.filter(p => p.role === 'leader')
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 10);

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    const shuffledFollowers = shuffle([...topFollowers]);
    const shuffledLeaders = shuffle([...topLeaders]);

    const round5 = [...shuffledFollowers.slice(0, 5), ...shuffledLeaders.slice(0, 5)];
    const round6 = [...shuffledFollowers.slice(5), ...shuffledLeaders.slice(5)];

    await Promise.all([
      set(ref(db, 'roundParticipants/round5'), round5.reduce((acc, val, i) => {
        acc[i] = val;
        return acc;
      }, {})),
      set(ref(db, 'roundParticipants/round6'), round6.reduce((acc, val, i) => {
        acc[i] = val;
        return acc;
      }, {}))
    ]);
  } catch (err) {
    console.error(err);
    showPopup("Error during create the data.");
  }
}

saveBtn.addEventListener("click", async () => {
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
        await generateSemiFinalistsIfReady();
        saveBtn.disabled = true;
        window.location.href = "jury-dashboard.html";
      });
    });
  });
});

loadParticipants();
