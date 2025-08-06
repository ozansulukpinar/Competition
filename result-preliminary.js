// result-preliminary1.js
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

const roundName = document.getElementById("preliminary").value;

async function loadData() {
    const [participantsSnap, juriesSnap, preliminaryResultsSnap] = await Promise.all([
        get(ref(db, 'participants')),
        get(ref(db, 'users')),
        get(ref(db, `roundResults/${roundName}`))
    ]);

    if (!participantsSnap.exists() || !juriesSnap.exists() || !preliminaryResultsSnap.exists()) return;

    const participants = Object.values(participantsSnap.val());
    const resultData = preliminaryResultsSnap.val();
    const juryUsernames = Object.keys(resultData);

    const allResults = {};

    for (const [juryUsername, evaluations] of Object.entries(resultData)) {
        evaluations.forEach(evaluation => {
            const pid = evaluation.participantId;
            if (!allResults[pid]) {
                allResults[pid] = { passCount: 0, votes: {}, data: null };
            }
            allResults[pid].votes[juryUsername] =
                (allResults[pid].votes[juryUsername] || 0) + (evaluation.passed ? 1 : 0);
            if (evaluation.passed) allResults[pid].passCount++;
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
    tr.innerHTML = `<th>No.</th>
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
        if (val === 1) {
            td.innerHTML = '✔️';
            td.classList.add("check");
        } else {
            td.innerHTML = "❌";
            td.classList.add("cross");
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
