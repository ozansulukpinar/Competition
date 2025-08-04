// result-semi-all.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

const followersTable = document.getElementById("followers-table");
const leadersTable = document.getElementById("leaders-table");

async function loadData() {
  const [participantsSnap, juriesSnap, semiResultsSnap] = await Promise.all([
    get(ref(db, 'participants')),
    get(ref(db, 'users')),
    get(ref(db, 'roundResults/semi'))
  ]);

  if (!participantsSnap.exists() || !juriesSnap.exists() || !semiResultsSnap.exists()) return;

  const participants = Object.values(participantsSnap.val());
  const juries = Object.values(juriesSnap.val()).filter(u => u.role === 'jury');
  const juryUsernames = juries.map(j => j.username);

  const allResults = {};
  const resultData = semiResultsSnap.val();

  for (const [juryUsername, evaluations] of Object.entries(resultData)) {
    evaluations.forEach(evaluation => {
      const pid = evaluation.participantId;
      if (!allResults[pid]) {
        allResults[pid] = { passCount: 0, votes: {}, data: null };
      }
      allResults[pid].votes[juryUsername] =
        (allResults[pid].votes[juryUsername] || 0) + (evaluation.pass ? 1 : 0);
      if (evaluation.pass) allResults[pid].passCount++;
    });
  }

  participants.forEach(p => {
    if (allResults[p.id]) allResults[p.id].data = p;
  });

  const followerRows = [];
  const leaderRows = [];

  renderHeader(followersTable, juryUsernames);
  renderHeader(leadersTable, juryUsernames);

  Object.entries(allResults).forEach(([pid, { passCount, votes, data }]) => {
    if (!data) return;
    const row = buildRow(data, votes, passCount, juryUsernames);
    const obj = { row, passCount };
    if (data.role === "follower") followerRows.push(obj);
    else leaderRows.push(obj);
  });

  followerRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => followersTable.appendChild(row));
  leaderRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => leadersTable.appendChild(row));
}

function renderHeader(table, jurors) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<th>Competitor No</th>
    ${jurors.map(j => `<th>${j}</th>`).join("")}
    `;
  table.appendChild(tr);
}

function buildRow(data, votes, passCount, jurors) {
  const tr = document.createElement("tr");
  const fullName = `${data.id}`;

  const tdName = document.createElement("td");
  tdName.innerHTML = '<b>' + fullName + '</b>';
  tr.appendChild(tdName);

  jurors.forEach(j => {
    const td = document.createElement("td");
    const val = votes[j];
    if (val > 0) {
      td.innerHTML = "✔️";
      td.classList.add("check");
    } else if (val === 0) {
      td.innerHTML = "❌";
      td.classList.add("cross");
    } else {
      td.innerHTML = "-";
    }
    tr.appendChild(td);
  });

  return tr;
}

const backBtn = document.getElementById("back-eval");

function goBack() {
  window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();
