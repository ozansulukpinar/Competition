// rounds-preliminary1.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const rounds = ["round15", "round16", "round17", "round18", "round19"];
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

            Object.values(data)
                .sort((a, b) => a.id - b.id)
                .forEach(participant => {
                    const container = participant.role === 'follower' ? followersDiv : leadersDiv;
                    createParticipantRow(participant, participant.role, container);
                });
        });
    });

    Promise.all(promises).then(() => {
        console.log("All round data loaded.");
    });
}

async function generatePreliminary2FinalistsIfReady() {
    try {
        const [usersSnap, progressSnap] = await Promise.all([
            get(ref(db, 'users')),
            get(ref(db, 'juryProgress'))
        ]);

        if (!usersSnap.exists() || !progressSnap.exists()) return;

        const users = Object.values(usersSnap.val()).filter(u => u.role === 'jury');
        const progress = progressSnap.val();

        // Eğer 5 jüri de "preliminary2" aşamasındaysa devam edilecek
        const juriesInPreliminary2 = users.filter(u => progress[u.username] === 'preliminary2');
        if (juriesInPreliminary2.length < 5) return;

        const [preliminary1Snap, participantsSnap] = await Promise.all([
            get(ref(db, 'roundResults/preliminary1')),
            get(ref(db, 'participants'))
        ]);

        if (!preliminary1Snap.exists() || !participantsSnap.exists()) return;

        const preliminary1Results = preliminary1Snap.val();
        const participants = Object.values(participantsSnap.val());

        const scores = {};

        for (const [jury, evaluations] of Object.entries(preliminary1Results)) {
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
            .slice(0, 40);

        const topLeaders = enriched
            .filter(p => p.role === 'leader')
            .sort((a, b) => b.score - a.score)
            .slice(0, 40);

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

        const roundAssignments = {
            round11: {
                followers: shuffledFollowers.splice(0, 10),
                leaders: shuffledLeaders.splice(0, 10)
            },
            round12: {
                followers: shuffledFollowers.splice(0, 10),
                leaders: shuffledLeaders.splice(0, 10)
            },
            round13: {
                followers: shuffledFollowers.splice(0, 10),
                leaders: shuffledLeaders.splice(0, 10)
            },
            round14: {
                followers: shuffledFollowers,
                leaders: shuffledLeaders
            }
        };

        for (const [round, data] of Object.entries(roundAssignments)) {
            const combined = [...data.followers, ...data.leaders];
            const roundRef = ref(db, `roundParticipants/${round}`);
            await set(roundRef, combined.reduce((acc, item, i) => {
                acc[i] = item;
                return acc;
            }, {}));
        }
    } catch (err) {
        console.error(err);
        showPopup("Error during save preliminary II competitors");
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

async function validateAndSave() {
    const followers = allEvaluations.filter(e => e.participant.role === 'follower' && e.button.dataset.state === 'on');
    const leaders = allEvaluations.filter(e => e.participant.role === 'leader' && e.button.dataset.state === 'on');

    const followerDiff = followers.length - 40;
    const leaderDiff = leaders.length - 40;

    if (followerDiff !== 0 || leaderDiff !== 0) {
        let msg = "";
        if (followerDiff !== 0) {
            msg += `${Math.abs(followerDiff)} ${followerDiff > 0 ? "extra followers selected" : "missing followers is there"} . Please ${followerDiff > 0 ? "reduce to" : "increase to"} 40. \n`;
        }
        if (leaderDiff !== 0) {
            msg += `${Math.abs(leaderDiff)} ${leaderDiff > 0 ? "extra leaders selected" : "missing leaders is there"} . Please ${leaderDiff > 0 ? "reduce to" : "increase to"} 40.`;
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

    try {
        await set(ref(db, `roundResults/preliminary1/${currentUser}`), finalData);
        await updateJuryProgress(`${currentUser}`, 'preliminary2');
        await generatePreliminary2FinalistsIfReady();
        globalSaveBtn.disabled = true;
        window.location.href = "jury-dashboard.html";
    } catch (error) {
        console.error("Error saving results:", error);
    }
}

globalSaveBtn.addEventListener("click", validateAndSave);
loadAllRounds();
updateSelectionSummary();
