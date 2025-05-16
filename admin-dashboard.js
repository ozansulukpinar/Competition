// admin-dashboard.js
import { db } from './firebase-init.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".admin-buttons button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const link = btn.getAttribute("data-link");
      if (link) window.location.href = link;
    });
  });
});
