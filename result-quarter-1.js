// result-quarter-1.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

const followersTable = document.getElementById("followers-table");
const leadersTable = document.getElementById("leaders-table");

async function loadData() {
  const [usersSnap, jurySnap, resultSnap] = await Promise.all([
    get(ref(db, 'participants')),
    get(ref(db, 'users')),
    get(ref(db, `roundResults/${roundName}`))
  ]);

  if (!usersSnap.exists() || !jurySnap.exists() || !resultSnap.exists()) return;

  const participants = Object.values(usersSnap.val());
  const juries = Object.values(jurySnap.val()).filter(u => u.role === 'jury');
  const results = resultSnap.val();

  const grouped = {};
  juries.forEach(j => {
    const juryResults = results[j.username] || [];
    juryResults.forEach(r => {
      if (!grouped[r.participantId]) grouped[r.participantId] = { passCount: 0, votes: {}, data: null };
      grouped[r.participantId].votes[j.username] = r.pass;
      if (r.pass) grouped[r.participantId].passCount++;
    });
  });

  participants.forEach(p => {
    if (grouped[p.id]) grouped[p.id].data = p;
  });

  const followerRows = [];
  const leaderRows = [];

  Object.entries(grouped).forEach(([id, { passCount, votes, data }]) => {
    if (!data) return;
    const row = buildRow(data, votes, passCount, juries);
    if (data.role === "follower") followerRows.push({ row, passCount });
    else leaderRows.push({ row, passCount });
  });

  followerRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => followersTable.appendChild(row));
  leaderRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => leadersTable.appendChild(row));

  renderHeader(followersTable, juries);
  renderHeader(leadersTable, juries);
}

function renderHeader(table, juries) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<th>Yarışmacı No ve Adı Soyadı</th>
    ${juries.map(j => `<th>${j.username}</th>`).join("")}
    <th>Sonuç</th>`;
  table.appendChild(tr);
}

function buildRow(data, votes, passCount, juries) {
  const tr = document.createElement("tr");
  const fullName = `${data.id} - ${data.name} ${data.surname}`;

  const tdName = document.createElement("td");
  tdName.textContent = fullName;
  tr.appendChild(tdName);

  juries.forEach(j => {
    const td = document.createElement("td");
    const vote = votes[j.username];
    td.innerHTML = vote === true
      ? "✅"
      : vote === false
      ? "❌"
      : "-";
    tr.appendChild(td);
  });

  const tdResult = document.createElement("td");
  tdResult.textContent = passCount > juries.length / 2 ? "✅" : "❌";
  tr.appendChild(tdResult);

  return tr;
}

const backBtn = document.getElementById("back-eval");
  
function goBack() {
  window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadData();
