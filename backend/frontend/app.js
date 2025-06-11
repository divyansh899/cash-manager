let currentBalance = 0;

// Fetch and display existing entries on page load
window.addEventListener("DOMContentLoaded", () => {
  fetch("/entries")
    .then(response => response.json())
    .then(entries => {
      const tableBody = document.getElementById("tableBody");
      tableBody.innerHTML = "";
      currentBalance = 0;

      entries.forEach(entry => {
        currentBalance = parseFloat(entry.balance);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${entry.date}</td>
          <td>${entry.head}</td>
          <td>₹${parseFloat(entry.cashIn).toFixed(2)}</td>
          <td>₹${parseFloat(entry.cashOut).toFixed(2)}</td>
          <td class="balance-cell">₹${entry.balance.toFixed(2)}</td>
          <td>${entry.transactionType}</td>
          <td>${entry.notes}</td>
          <td><button class="btn btn-sm btn-danger delete-btn" data-id="${entry.id}">Delete</button></td>
        `;
        tableBody.appendChild(row);
      });

      document.getElementById("balance").innerText = currentBalance.toFixed(2);
    });
});

// Add new entry
document.getElementById("entryForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const date = document.getElementById("date").value;
  const head = document.getElementById("head").value;
  const cashIn = parseFloat(document.getElementById("cashIn").value) || 0;
  const cashOut = parseFloat(document.getElementById("cashOut").value) || 0;
  const transactionType = document.getElementById("transactionType").value;
  const notes = document.getElementById("notes").value;

  fetch("/add-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, head, cashIn, cashOut, transactionType, notes })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message.includes("success")) {
        location.reload(); // Reload to show updated table
      } else {
        alert("Failed to add entry");
      }
    });
});

// Delete entry
document.getElementById("tableBody").addEventListener("click", function (e) {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    if (confirm("Are you sure you want to delete this entry?")) {
      fetch(`/delete-entry/${id}`, {
        method: "DELETE"
      })
        .then(res => res.json())
        .then(data => {
          if (data.message.includes("success")) {
            location.reload(); // Reload to update table and balance
          } else {
            alert("Failed to delete entry");
          }
        });
    }
  }
});
