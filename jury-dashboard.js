// jury-dashboard.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const roundButtons = document.querySelectorAll(".round-btn");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

// Giriş yapan jürinin kullanıcı adı localStorage'dan alınır
const currentUser = localStorage.getItem("juryUsername");

if (!currentUser) {
  window.location.href = "index.html";
}

// Hangi turda olduğunu Firebase üzerinden kontrol et
const progressRef = ref(db, `juryProgress/${currentUser}`);

get(progressRef).then(snapshot => {
  const roundIndex = snapshot.exists() ? snapshot.val() : 0;

  // Tüm butonları kapat
  roundButtons.forEach(btn => btn.disabled = true);

  // Sadece aktif olanı aç ve animasyon ver
  if (roundIndex < roundButtons.length) {
    const activeBtn = roundButtons[roundIndex];
    activeBtn.disabled = false;
    activeBtn.classList.add("active-blink");
  } else {
    showPopup("Yarışma tamamlandı");
  }
}).catch(err => {
  console.error(err);
  showPopup("Jüri ilerleme verisi alınamadı.");
});

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
