// jury-dashboard.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const roundButtons = document.querySelectorAll(".round-btn");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

// Giriş yapan jürinin kullanıcı adı sessionStorage'dan alınır
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

// Hangi turda olduğunu Firebase üzerinden kontrol et
  const progressSnap = await get(ref(db, `juryProgress/${currentUser}`));
  const completedKey = progressSnap.exists() ? progressSnap.val() : null;

  const roundOrder = [
    "round1", "round2", "round3", "round4",
    "round5", "round6", "round7"
  ];

  let nextIndex = 0;
  if (completedKey) {
    const completedIndex = roundOrder.indexOf(completedKey);
    if (completedIndex !== -1 && completedIndex < roundOrder.length - 1) {
      nextIndex = completedIndex + 1;
    } else {
      nextIndex = roundOrder.length; // yarışma tamamlandı
    }
  }

  roundButtons.forEach((btn, idx) => {
    if (idx === nextIndex) {
      btn.disabled = false;
      btn.classList.add("active-round");
    } else {
      btn.disabled = true;
      btn.classList.add("disabled-round");
    }
  });

  if (nextIndex >= roundOrder.length) {
    showPopup("Yarışma tamamlandı. Tüm değerlendirmeleri yaptınız.");
  }
//

roundButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    // Her turun ayrı sayfasına yönlendir
    window.location.href = `round${index + 1}.html`;
  });
});

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}
