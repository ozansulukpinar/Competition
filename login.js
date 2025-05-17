// login.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

// Şifreler base64 ile "gizli"
const encryptedPasswords = {
  jury: btoa("251705"),      // base64 encoded
  admin: btoa("231810")
};

usernameInput.addEventListener("input", () => {
  usernameInput.value = usernameInput.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
  toggleLoginButton();
});

passwordInput.addEventListener("input", () => {
  passwordInput.value = passwordInput.value.replace(/[^0-9]/g, '').slice(0, 6);
  toggleLoginButton();
});

function toggleLoginButton() {
  loginBtn.disabled = !(usernameInput.value && passwordInput.value);
}

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

// Yöneticinin ilk girişi sonrası yarışmacılar istenilen sayıda çeyrek finallere rastgele şekilde dağıtılır
async function initializeCompetitionRounds() {
  const startRef = ref(db, 'competitionStart');
  const startSnap = await get(startRef);

  if (startSnap.exists() && startSnap.val() === true) {
    console.log("Competition already started. Skipping initialization.");
    return;
  }

  const participantsSnap = await get(ref(db, 'participants'));
  if (!participantsSnap.exists()) {
    console.log("No participants found.");
    return;
  }

  const participants = Object.values(participantsSnap.val());
  const followers = participants.filter(p => p.role === 'follower');
  const leaders = participants.filter(p => p.role === 'leader');

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const shuffledFollowers = shuffle([...followers]);
  const shuffledLeaders = shuffle([...leaders]);

  const roundAssignments = {
    round1: {
      followers: shuffledFollowers.splice(0, 5),
      leaders: shuffledLeaders.splice(0, 5)
    },
    round2: {
      followers: shuffledFollowers.splice(0, 4),
      leaders: shuffledLeaders.splice(0, 4)
    },
    round3: {
      followers: shuffledFollowers.splice(0, 3),
      leaders: shuffledLeaders.splice(0, 3)
    },
    round4: {
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

  await set(startRef, true);
  console.log("Competition initialized and competitionStart set to true.");
}

loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const passwordEncoded = btoa(password);

  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return showPopup("Kullanıcı verisi okunamadı.");

  const users = snapshot.val();
  const user = Object.values(users).find(u => u.username === username);

  if (!user) return showPopup("Hata: Geçerli olmayan kullanıcı adı ile giriş yapmaya çalışıyorsunuz.");

  const correctRolePassword = encryptedPasswords[user.role];
  const isCorrectPassword = (passwordEncoded === correctRolePassword);

  if (!isCorrectPassword) {
    return showPopup("Hata: Diğer kullanıcı tipine ait şifreyi giriyorsunuz.");
  }

  window.sessionStorage.setItem("username", username);

  // Kullanıcı rolüne göre yönlendirme
  if (user.role === "jury") {
    window.location.href = "jury-dashboard.html";
  } else if (user.role === "admin") {
    await initializeCompetitionRounds();
    window.location.href = "admin-dashboard.html";
  }
});

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}
