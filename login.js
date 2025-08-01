// login.js
import { db } from './firebase-init.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

// Şifreler base64 ile "gizli"
const encryptedPasswords = {
  jury: btoa("250708"),      // base64 encoded
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
  if (!snapshot.exists()) return showPopup("User data cannot read.");

  const users = snapshot.val();
  const user = Object.values(users).find(u => u.username === username);

  if (!user) return showPopup("Error: You are trying to log in with an invalid username.");

  const correctRolePassword = encryptedPasswords[user.role];
  const isCorrectPassword = (passwordEncoded === correctRolePassword);

  if (!isCorrectPassword) {
    return showPopup("Error: You are entering an incorrect password.");
  }

  window.sessionStorage.setItem("username", username);

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
