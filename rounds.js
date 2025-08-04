// rounds.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const roundIds = ["round1", "round2", "round3", "round4", "round5", "round6", "round7", "round8", "round9", "round10", "round11", "round12", "round13", "round14", "round15", "round16", "round17", "round18", "round19"];

function createTable(roundName, followers, leaders) {
    const container = document.getElementById(roundName);

    const table = document.createElement("table");

    const header = document.createElement("tr");
    header.innerHTML = `<th>Follower(s)</th><th>Leader(s)</th>`;
    table.appendChild(header);

    const maxLength = Math.max(followers.length, leaders.length);
    for (let i = 0; i < maxLength; i++) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${followers[i] !== undefined ? followers[i] : ""}</td>
      <td>${leaders[i] !== undefined ? leaders[i] : ""}</td>
    `;
        table.appendChild(row);
    }

    container.appendChild(table);
}

function loadRoundParticipants() {
    roundIds.forEach(round => {
        const roundRef = ref(db, `roundParticipants/${round}`);
        get(roundRef).then(snapshot => {
            const followers = [];
            const leaders = [];

            if (snapshot.exists()) {
                const participants = Object.values(snapshot.val());
                participants.forEach(p => {
                    if (p.role === "follower") followers.push(p.id);
                    else if (p.role === "leader") leaders.push(p.id);
                });

                // Tabloda hiç veri yoksa, bu round görünmesin
                if (followers.length === 0 && leaders.length === 0) {
                    const container = document.getElementById(round);
                    container.style.display = "none";
                    return;
                }

                followers.sort((a, b) => a - b);
                leaders.sort((a, b) => a - b);

                createTable(round, followers, leaders);
            }
        });
    });
}

const backBtn = document.getElementById("back-eval");

function goBack() {
    window.location.href = "admin-dashboard.html";
}
backBtn.addEventListener('click', goBack);

loadRoundParticipants();
