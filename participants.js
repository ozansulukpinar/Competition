import { db } from './firebase-init.js';
import { ref, get, set, remove, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const tableBody = document.querySelector("#participants-table tbody");
const addBtn = document.getElementById("add-btn");
const formPopup = document.getElementById("form-popup");
const messagePopup = document.getElementById("message-popup");
const messageText = document.getElementById("message-text");
const messageOk = document.getElementById("message-ok");
const deletePopup = document.getElementById("delete-popup");
const confirmDelete = document.getElementById("confirm-delete");
const cancelDelete = document.getElementById("cancel-delete");
const closeForm = document.getElementById("close-form");
const saveForm = document.getElementById("save-form");
const warning = document.getElementById("form-warning");

let editMode = false;
let editKey = null;
let deleteKey = null;

function showMessage(msg) {
    messageText.textContent = msg;
    messagePopup.classList.remove("hidden");
}

messageOk.addEventListener("click", () => {
    messagePopup.classList.add("hidden");
    loadData();
});

addBtn.addEventListener("click", () => {
    editMode = false;
    editKey = null;
    warning.textContent = "";
    formPopup.classList.remove("hidden");
    document.getElementById("input-id").value = "";
    document.getElementById("input-name").value = "";
    document.getElementById("input-surname").value = "";
    document.getElementById("input-role").value = "";
});

closeForm.addEventListener("click", () => formPopup.classList.add("hidden"));
cancelDelete.addEventListener("click", () => deletePopup.classList.add("hidden"));

saveForm.addEventListener("click", async () => {
    const id = document.getElementById("input-id").value.trim();
    const name = document.getElementById("input-name").value.trim();
    const surname = document.getElementById("input-surname").value.trim();
    const role = document.getElementById("input-role").value;

    console.log("INPUT VALUES:", { id, name, surname, role });

    if (!id || !name || !surname || !role) {
        warning.textContent = "You need to fill all inputs";
        return;
    }

    const idNumber = parseInt(id);
    if (isNaN(idNumber)) {
        warning.textContent = "ID must be a number";
        return;
    }

    const idKey = idNumber.toString();
    const dataRef = ref(db, `participants/${idKey}`);

    const newData = { id: idNumber, name, surname, role };

    console.log("Type of each field:", {
        id: typeof idNumber,
        name: typeof name,
        surname: typeof surname,
        role: typeof role
    });

    console.log("newData before set:", JSON.stringify(newData));

    console.log("Saving object:", newData);

    if (!editMode) {
        const snap = await get(dataRef);
        if (snap.exists()) {
            warning.textContent = "There is already a record. Change the id";
            return;
        }
    }

    await set(dataRef, newData);
    formPopup.classList.add("hidden");
    showMessage("Record saved successfully");
});

confirmDelete.addEventListener("click", async () => {
    if (deleteKey !== null) {
        await remove(ref(db, `participants/${deleteKey}`));
        deletePopup.classList.add("hidden");
        showMessage("Record deleted successfully!");
    }
});

function createRow(participant) {
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${participant.id}</td>
    <td>${participant.name}</td>
    <td>${participant.surname}</td>
    <td>${participant.role}</td>
    <td>
      <button class="action-btn edit-btn"><i class="fas fa-pen"></i> Edit</button>
      <button class="action-btn delete-btn"><i class="fas fa-trash"></i> Delete</button>
    </td>
  `;

    const editButton = row.querySelector(".edit-btn");
    const deleteButton = row.querySelector(".delete-btn");

    editButton.addEventListener("click", () => {
        editMode = true;
        editKey = participant.id;
        warning.textContent = "";
        document.getElementById("input-id").value = participant.id;
        document.getElementById("input-name").value = participant.name;
        document.getElementById("input-surname").value = participant.surname;
        document.getElementById("input-role").value = participant.role;
        formPopup.classList.remove("hidden");
    });

    deleteButton.addEventListener("click", () => {
        deleteKey = participant.id;
        deletePopup.classList.remove("hidden");
    });

    return row;
}

function loadData() {
    const listRef = ref(db, "participants");
    onValue(listRef, snapshot => {
        tableBody.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            const sorted = Object.values(data).sort((a, b) => a.id - b.id);
            sorted.forEach(p => {
                tableBody.appendChild(createRow(p));
            });
        }
    });
}

loadData();
