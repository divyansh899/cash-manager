let currentBalance = 0;

document.getElementById("entryForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const date = document.getElementById("date").value;
  const head = document.getElementById("head").value;
  const cashIn = parseFloat(document.getElementById("cashIn").value) || 0;
  const cashOut = parseFloat(document.getElementById("cashOut").value) || 0;
  const transactionType = document.getElementById("transactionType").value;
  const notes = document.getElementById("notes").value;

  const data = {
    date,
    head,
    cashIn,
    cashOut,
    transactionType,
    notes
  };

  try {
    const res = await fetch('http://localhost:3000/add-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message);

    await loadEntries(); // Reload table with updated balance
    document.getElementById("entryForm").reset();
  } catch (err) {
    alert("Error submitting entry. Please try again.");
    console.error(err);
  }
});

async function loadEntries() {
  try {
    const res = await fetch('http://localhost:3000/entries');
    const entries = await res.json();

    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = '';

    let runningBalance = 0;

    entries.forEach(entry => {
      runningBalance += entry.cashIn - entry.cashOut;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.head}</td>
        <td>₹${entry.cashIn.toFixed(2)}</td>
        <td>₹${entry.cashOut.toFixed(2)}</td>
        <td class="balance-cell">₹${runningBalance.toFixed(2)}</td>
        <td>${entry.transactionType}</td>
        <td>${entry.notes}</td>
        <td><button class="btn btn-sm btn-danger delete-btn" data-id="${entry.id}">Delete</button></td>
      `;

      row.querySelector(".delete-btn").addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this entry?")) {
          await deleteEntry(entry.id);
          await loadEntries(); // Reload after deletion
        }
      });

      tableBody.appendChild(row);
    });

    currentBalance = runningBalance;
    document.getElementById("balance").innerText = currentBalance.toFixed(2);

  } catch (err) {
    alert("Failed to load entries.");
    console.error(err);
  }
}

async function deleteEntry(id) {
  try {
    const res = await fetch(`http://localhost:3000/delete-entry/${id}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    alert(result.message);
  } catch (err) {
    alert("Error deleting entry.");
    console.error(err);
  }
}

// Initial table load
loadEntries();