// result-quarter-all.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const followersTable = document.getElementById("followers-table");
const leadersTable = document.getElementById("leaders-table");

const roundNames = ["round1", "round2", "round3", "round4"];

async function loadData() {
  const [participantsSnap, juriesSnap, ...resultsSnaps] = await Promise.all([
    get(ref(db, 'participants')),
    get(ref(db, 'users')),
    ...roundNames.map(r => get(ref(db, `roundResults/${r}`)))
  ]);

  if (!participantsSnap.exists() || !juriesSnap.exists()) return;

  const participants = Object.values(participantsSnap.val());
  const juries = Object.values(juriesSnap.val()).filter(u => u.role === 'jury');
  const juryCount = juries.length;
  const juryUsernames = juries.map(j => j.username);

  const allResults = {};

  resultsSnaps.forEach((snap, idx) => {
    if (!snap.exists()) return;
    const resultData = snap.val();
    for (const [juryUsername, evaluations] of Object.entries(resultData)) {
      evaluations.forEach(eval => {
        const pid = eval.participantId;
        if (!allResults[pid]) {
          allResults[pid] = { passCount: 0, votes: {}, data: null };
        }
        allResults[pid].votes[juryUsername] =
          (allResults[pid].votes[juryUsername] || 0) + (eval.pass ? 1 : 0);
        if (eval.pass) allResults[pid].passCount++;
      });
    }
  });

  participants.forEach(p => {
    if (allResults[p.id]) allResults[p.id].data = p;
  });

  const followerRows = [];
  const leaderRows = [];

  Object.entries(allResults).forEach(([pid, { passCount, votes, data }]) => {
    if (!data) return;
    const row = buildRow(data, votes, passCount, juryUsernames);
    const obj = { row, passCount };
    if (data.role === "follower") followerRows.push(obj);
    else leaderRows.push(obj);
  });

  followerRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => followersTable.appendChild(row));
  leaderRows.sort((a, b) => b.passCount - a.passCount).forEach(({ row }) => leadersTable.appendChild(row));

  renderHeader(followersTable, juryUsernames);
  renderHeader(leadersTable, juryUsernames);
}

function renderHeader(table, jurors) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<th>Yarışmacı No ve Adı Soyadı</th>
    ${jurors.map(j => `<th>${j}</th>`).join("")}
    <th>Sonuç</th>`;
  table.appendChild(tr);
}

function buildRow(data, votes, passCount, jurors) {
  const tr = document.createElement("tr");
  const fullName = `${data.id} - ${data.name} ${data.surname}`;

  const tdName = document.createElement("td");
  tdName.textContent = fullName;
  tr.appendChild(tdName);

  jurors.forEach(j => {
    const td = document.createElement("td");
    const val = votes[j];
    td.innerHTML = val > 0 ? "✅" : val === 0 ? "❌" : "-";
    tr.appendChild(td);
  });

  const tdResult = document.createElement("td");
  tdResult.textContent = passCount > jurors.length * 2 ? "✅" : "❌";
  tr.appendChild(tdResult);

  return tr;
}

loadData();
