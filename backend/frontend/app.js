let currentBalance = 0;

// Fetch and display existing entries on page load
window.addEventListener("DOMContentLoaded", () => {
  fetchEntries();
  populateHeadFilter();
});

// Load all entries and render table
function fetchEntries() {
  fetch("/entries")
    .then(response => response.json())
    .then(entries => {
      // Sort by date (ascending)
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      renderTable(entries);
    });
}


// Render table from entry array
function renderTable(entries) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";
  currentBalance = 0;

  let totalIn = 0;
  let totalOut = 0;

  entries.forEach(entry => {
    totalIn += parseFloat(entry.cashIn);
    totalOut += parseFloat(entry.cashOut);
    currentBalance = parseFloat(entry.balance);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(entry.date)}</td>
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
  document.getElementById("totalIn").innerText = totalIn.toFixed(2);
  document.getElementById("totalOut").innerText = totalOut.toFixed(2);
}


  // Format date as DD-MM-YYYY
function formatDate(isoDate) {
  const dateObj = new Date(isoDate);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}


  document.getElementById("balance").innerText = currentBalance.toFixed(2);




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
          if (
            data.message.toLowerCase().includes("deleted") ||
            data.message.toLowerCase().includes("success")
          ) {
            location.reload(); // ✅ force refresh to update table
          } else {
            alert("❌ Failed to delete entry: " + data.message);
          }
        })
        .catch(err => {
          alert("❌ Error while deleting: " + err.message);
        });
    }
  }
});


// ✅ Filter entries by date and head
function applyFilters() {
  const monthValue = document.getElementById("filterMonth").value;
  const head = document.getElementById("filterHead").value;

  fetch("/entries")
    .then(response => response.json())
    .then(entries => {
      let filtered = entries;

      if (monthValue) {
        const [year, month] = monthValue.split("-");
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.date);
          return (
            entryDate.getFullYear().toString() === year &&
            (entryDate.getMonth() + 1).toString().padStart(2, "0") === month
          );
        });
      }

      if (head) {
        filtered = filtered.filter(entry => entry.head === head);
      }

      renderTable(filtered);
    });
}


// ✅ Reset filters and reload all
function resetFilters() {
  document.getElementById("filterMonth").value = "";
  document.getElementById("filterHead").value = "";
  fetchEntries();
}


// ✅ Populate head filter dropdown
function populateHeadFilter() {
  fetch("/heads")
    .then(res => res.json())
    .then(heads => {
      const filterSelect = document.getElementById("filterHead");
      filterSelect.innerHTML = '<option value="">All</option>';
      heads.forEach(head => {
        const option = document.createElement("option");
        option.value = head;
        option.textContent = head;
        filterSelect.appendChild(option);
      });
    });
}
