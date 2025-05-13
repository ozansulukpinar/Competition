// login.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

  window.localStorage.setItem("juryUsername", username);

  // Kullanıcı rolüne göre yönlendirme
  if (user.role === "jury") {
    window.location.href = "jury-dashboard.html";
  } else if (user.role === "admin") {
    window.location.href = "admin-dashboard.html";
  }
});

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}
