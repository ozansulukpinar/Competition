// result-reround.js
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
  const [participantsSnap, juriesSnap, resultsSnap] = await Promise.all([
    get(ref(db, 'participants')),
    get(ref(db, 'users')),
    get(ref(db, `roundResults/reround`))
  ]);

  if (!participantsSnap.exists() || !juriesSnap.exists() || !resultsSnap.exists()) return;

  const participants = Object.values(participantsSnap.val());
  const results = resultsSnap.val();
  const juryUsernames = Object.keys(results);

  const allVotes = {};

  for (const [jury, votes] of Object.entries(results)) {
    votes.forEach(({ participantId, rank }) => {
      if (!allVotes[participantId]) allVotes[participantId] = { total: 0, count: 0, votes: {}, data: null, rankCounts: {} };
      const rankInt = parseInt(rank);
      allVotes[participantId].total += rankInt;
      allVotes[participantId].count++;
      allVotes[participantId].votes[jury] = rankInt;
      allVotes[participantId].rankCounts[rankInt] = (allVotes[participantId].rankCounts[rankInt] || 0) + 1;
    });
  }

  participants.forEach(p => {
    if (allVotes[p.id]) allVotes[p.id].data = p;
  });

  const followerRows = [];
  const leaderRows = [];

  renderHeader(followersTable, juryUsernames);
  renderHeader(leadersTable, juryUsernames);

  Object.entries(allVotes).forEach(([pid, { total, count, votes, data, rankCounts }]) => {
    if (!data) return;
    const row = buildRow(data, votes, null, juryUsernames);
    const obj = { row, rankCounts: allVotes[pid].rankCounts };
    if (data.role === "follower") followerRows.push(obj);
    else leaderRows.push(obj);
  });

  function compareByRanks(a, b) {
    for (let i = 1; i <= 7; i++) {
      const aCount = a.rankCounts[i] || 0;
      const bCount = b.rankCounts[i] || 0;
      if (aCount !== bCount) return bCount - aCount;
    }
    return 0;
  }

  followerRows.sort(compareByRanks).forEach(({ row }) => followersTable.appendChild(row));
  leaderRows.sort(compareByRanks).forEach(({ row }) => leadersTable.appendChild(row));
}

function renderHeader(table, jurors) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<th>No.</th>
    ${jurors.map(j => `<th>${j}</th>`).join("")}
    `;
  table.appendChild(tr);
}

function buildRow(data, votes, average, jurors) {
  const tr = document.createElement("tr");
  const fullName = `${data.id}`;

  const tdName = document.createElement("td");
  tdName.innerHTML = '<b>' + fullName + '</b>';
  tr.appendChild(tdName);

  jurors.forEach(j => {
    const td = document.createElement("td");
    td.textContent = votes[j] || "-";
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
