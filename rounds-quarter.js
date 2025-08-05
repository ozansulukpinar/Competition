// rounds-quarter.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const rounds = ["round1", "round2", "round3", "round4"];
const currentUser = sessionStorage.getItem("username");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupOk = document.getElementById("popup-ok");
const globalSaveBtn = document.getElementById("save-all-eval");

popupOk.addEventListener("click", () => {
    popup.classList.add("hidden");
    document.querySelector(".round-screen").classList.remove("blur-background");
});

function showPopup(message) {
    popupMessage.textContent = message;
    popup.classList.remove("hidden");
    document.querySelector(".round-screen").classList.add("blur-background");
}

let allEvaluations = [];

function createParticipantRow(participant, group, container) {
    const row = document.createElement("div");
    row.className = "participant-row";

    const label = document.createElement("div");
    label.className = "participant-label";
    label.textContent = `${participant.id}`;

    const toggle = document.createElement("div");
    toggle.className = "toggle-switch single";

    const btn = document.createElement("button");
    btn.className = "switch-label";
    btn.textContent = "No";
    btn.dataset.state = "off";

    btn.addEventListener("click", () => {
        if (btn.dataset.state === "off") {
            btn.dataset.state = "on";
            btn.classList.add("active");
            btn.style.backgroundColor = "green";
            btn.textContent = "Yes";
        } else {
            btn.dataset.state = "off";
            btn.classList.remove("active");
            btn.style.backgroundColor = "red";
            btn.textContent = "No";
        }
        updateSelectionSummary();
    });

    toggle.appendChild(btn);
    row.appendChild(label);
    row.appendChild(toggle);
    container.appendChild(row);

    allEvaluations.push({ participant, button: btn });
}

function loadAllRounds() {
    let promises = rounds.map(roundName => {
        return get(ref(db, `roundParticipants/${roundName}`)).then(snapshot => {
            if (!snapshot.exists()) return;
            const data = snapshot.val();
            const followersDiv = document.getElementById(`followers-${roundName}`);
            const leadersDiv = document.getElementById(`leaders-${roundName}`);

            Object.values(data).forEach(participant => {
                const container = participant.role === 'follower' ? followersDiv : leadersDiv;
                createParticipantRow(participant, participant.role, container);
            });
        });
    });

    Promise.all(promises).then(() => {
        console.log("All round data loaded.");
    });
}

async function generateSemiFinalistsIfReady() {
    try {
        const [usersSnap, progressSnap] = await Promise.all([
            get(ref(db, 'users')),
            get(ref(db, 'juryProgress'))
        ]);

        if (!usersSnap.exists() || !progressSnap.exists()) return;

        const users = Object.values(usersSnap.val()).filter(u => u.role === 'jury');
        const progress = progressSnap.val();

        // Eğer 7 jüri de "semi" aşamasındaysa devam edilecek
        const juriesInSemi = users.filter(u => progress[u.username] === 'semi');
        if (juriesInSemi.length < 7) return;

        const [quarterSnap, participantsSnap] = await Promise.all([
            get(ref(db, 'roundResults/quarter')),
            get(ref(db, 'participants'))
        ]);

        if (!quarterSnap.exists() || !participantsSnap.exists()) return;

        const quarterResults = quarterSnap.val();
        const participants = Object.values(participantsSnap.val());

        const scores = {};

        for (const [jury, evaluations] of Object.entries(quarterResults)) {
            evaluations.forEach(({ participantId, pass }) => {
                if (!scores[participantId]) scores[participantId] = 0;
                if (pass) scores[participantId]++;
            });
        }

        const enriched = participants.map(p => ({
            ...p,
            score: scores[p.id] || 0
        }));

        const topFollowers = enriched
            .filter(p => p.role === 'follower')
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

        const topLeaders = enriched
            .filter(p => p.role === 'leader')
            .sort((a, b) => b.score - a.score)
            .slice(0, 13);

        // Karıştırma fonksiyonu
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        const shuffledFollowers = shuffle([...topFollowers]);
        const shuffledLeaders = shuffle([...topLeaders]);

        const round5 = [
            ...shuffledFollowers.slice(0, 6),
            ...shuffledLeaders.slice(0, 7)
        ];

        const round6 = [
            ...shuffledFollowers.slice(0, 6),
            ...shuffledLeaders.slice(0, 6)
        ];

        // Kaydet
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
        showPopup("Error during save semi-finalists");
    }
}

async function updateJuryProgress(username, roundName) {
    if (!username || !roundName) return;

    try {
        const progressRef = ref(db, `juryProgress/${username}`);
        await set(progressRef, roundName);
        console.log(`Progress updated: ${username} → ${roundName}`);
    } catch (err) {
        console.error("Error updating jury progress:", err);
    }
}

function updateSelectionSummary() {
    const followers = allEvaluations.filter(e => e.participant.role === 'follower' && e.button.dataset.state === 'on').length;
    const leaders = allEvaluations.filter(e => e.participant.role === 'leader' && e.button.dataset.state === 'on').length;
    document.getElementById("selection-summary").textContent =
        `So far you have selected ${followers} followers and ${leaders} leaders`;
}

function validateAndSave() {
    const followers = allEvaluations.filter(e => e.participant.role === 'follower' && e.button.dataset.state === 'on');
    const leaders = allEvaluations.filter(e => e.participant.role === 'leader' && e.button.dataset.state === 'on');

    const followerDiff = followers.length - 12;
    const leaderDiff = leaders.length - 13;

    if (followerDiff !== 0 || leaderDiff !== 0) {
        let msg = "";
        if (followerDiff !== 0) {
            msg += `${Math.abs(followerDiff)} ${followerDiff > 0 ? "extra followers selected" : "missing followers is there"} . Please ${followerDiff > 0 ? "reduce to" : "increase to"} 12. \n`;
        }
        if (leaderDiff !== 0) {
            msg += `${Math.abs(leaderDiff)} ${leaderDiff > 0 ? "extra leaders selected" : "missing leaders is there"} . Please ${leaderDiff > 0 ? "reduce to" : "increase to"} 13.`;
        }
        showPopup(msg);
        return;
    }

    const finalData = [...followers, ...leaders].map(({ participant, button }) => ({
        jury: currentUser,
        participantId: participant.id,
        name: participant.name,
        surname: participant.surname,
        passed: button.dataset.state === "on"
    }));

    set(ref(db, `roundResults/quarter/${currentUser}`), finalData).then(() => {
        generateSemiFinalistsIfReady();
        updateJuryProgress(`${currentUser}`, 'semi');
        globalSaveBtn.disabled = true;
        window.location.href = "jury-dashboard.html";
    });
}

globalSaveBtn.addEventListener("click", validateAndSave);
loadAllRounds();
updateSelectionSummary();
