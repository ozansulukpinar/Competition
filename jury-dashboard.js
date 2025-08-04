// jury-dashboard.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

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

// Hangi turda olduğu Firebase üzerinden kontrol edilir
const progressSnap = await get(ref(db, `juryProgress/${currentUser}`));
const currentKey = progressSnap.exists() ? progressSnap.val() : null;

const roundOrder = [
  "preliminary1", "preliminary2", "preliminary3", "quarter", "semi", "final", "reround"
];

let currentIndex = 0;
if (currentKey) {
  const index = roundOrder.indexOf(currentKey);
  if (index !== -1) {
    currentIndex = index;
  } else {
    showPopup("Competition is completed."); // currentKey == end
    currentIndex = -1;
  }
}

roundButtons.forEach((btn, idx) => {
  if (idx === currentIndex) {
    btn.disabled = false;
    btn.classList.add("active-round");
  } else {
    btn.disabled = true;
    btn.classList.add("disabled-round");
  }
});

roundButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    // Her turun ayrı sayfasına yönlendir
    if (index == 6)
      window.location.href = `reround.html`;
    else
      window.location.href = roundOrder[index] + `.html`;
  });
});

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}
