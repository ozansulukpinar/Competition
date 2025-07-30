// result-final.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

const followersTable = document.getElementById("followers-table");
const leadersTable = document.getElementById("leaders-table");

async function loadData() {
  const [participantsSnap, juriesSnap, resultsSnap] = await Promise.all([
    get(ref(db, 'participants')),
    get(ref(db, 'users')),
    get(ref(db, `roundResults/${roundName}`))
  ]);

  if (!participantsSnap.exists() || !juriesSnap.exists() || !resultsSnap.exists()) return;

  const participants = Object.values(participantsSnap.val());
  const juries = Object.values(juriesSnap.val()).filter(u => u.role === 'jury');
  const juryUsernames = juries.map(j => j.username);
  const results = resultsSnap.val();

  const allVotes = {};

  for (const [jury, votes] of Object.entries(results)) {
    votes.forEach(({ participantId, rank }) => {
      if (!allVotes[participantId]) allVotes[participantId] = { total: 0, count: 0, votes: {}, data: null };
      allVotes[participantId].total += parseInt(rank);
      allVotes[participantId].count++;
      allVotes[participantId].votes[jury] = rank;
    });
  }

  participants.forEach(p => {
    if (allVotes[p.id]) allVotes[p.id].data = p;
  });

  const followerRows = [];
  const leaderRows = [];

  renderHeader(followersTable, juryUsernames);
  renderHeader(leadersTable, juryUsernames);

  Object.entries(allVotes).forEach(([pid, { total, count, votes, data }]) => {
    if (!data) return;
    const avg = total / count;
    const row = buildRow(data, votes, avg, juryUsernames);
    const obj = { row, avg };
    if (data.role === "follower") followerRows.push(obj);
    else leaderRows.push(obj);
  });

  followerRows.sort((a, b) => a.avg - b.avg).forEach(({ row }) => followersTable.appendChild(row));
  leaderRows.sort((a, b) => a.avg - b.avg).forEach(({ row }) => leadersTable.appendChild(row));
}

function renderHeader(table, jurors) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<th>Competitor No</th>
    ${jurors.map(j => `<th>${j}</th>`).join("")}
    <th>Result</th>`;
  table.appendChild(tr);
}

function buildRow(data, votes, average, jurors) {
  const tr = document.createElement("tr");
  const fullName = `${data.id}`;

  const tdName = document.createElement("td");
  tdName.textContent = fullName;
  tr.appendChild(tdName);

  jurors.forEach(j => {
    const td = document.createElement("td");
    td.textContent = votes[j] || "-";
    tr.appendChild(td);
  });

  const tdAvg = document.createElement("td");
  tdAvg.textContent = average.toFixed(2);
  tr.appendChild(tdAvg);

  return tr;
}

const backBtn = document.getElementById("back-eval");

function goBack() {
  window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();
