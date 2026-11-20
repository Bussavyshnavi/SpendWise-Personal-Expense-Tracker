
const expenseForm = document.getElementById("expenseForm");
const expenseName = document.getElementById("expenseName");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const expenseDate = document.getElementById("expenseDate");

const expenseList = document.getElementById("expenseList");

const totalExpenses = document.getElementById("totalExpenses");
const monthlyExpenses = document.getElementById("monthlyExpenses");
const totalTransactions = document.getElementById("totalTransactions");

const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const formHeading = document.getElementById("formHeading");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDeleteButton = document.getElementById("confirmDelete");
const keepExpenseButton = document.getElementById("keepExpense");

const budgetMonth = document.getElementById("budgetMonth");
const budgetAmount = document.getElementById("budgetAmount");

const budgetTotal = document.getElementById("budgetTotal");
const budgetSpent = document.getElementById("budgetSpent");
const budgetRemaining = document.getElementById("budgetRemaining");

const budgetPercentage = document.getElementById("budgetPercentage");
const budgetProgressBar = document.getElementById("budgetProgressBar");
const budgetStatus = document.getElementById("budgetStatus");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");

let expenses = [];
let allExpenses = [];
let editingExpenseId = null;
let deletingExpenseId = null;
let categoryChart = null;
let monthlyChart = null;
let searchTimer = null;
let toastTimer = null;


// Currency formatting
function formatCurrency(value) {
    return Number(value).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    });
}


// Date formatting
function formatDate(dateValue) {
    const parts = dateValue.split("-");
    if (parts.length !== 3) return dateValue;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// Current month
function getCurrentMonth() {
    const today = new Date();
    return today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0");
}


// Set current date
function setTodayDate() {
    const today = new Date();

    document.getElementById("todayDate").textContent =
        today.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    expenseDate.value = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}


// Toast message
function showToast(message, type = "success") {
    clearTimeout(toastTimer);

    toastMessage.textContent = message;
    toast.classList.remove("error", "show");

    if (type === "error") toast.classList.add("error");

    requestAnimationFrame(() => toast.classList.add("show"));

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// Build filter query
function getFilterQuery() {
    const params = new URLSearchParams();

    if (searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }

    if (filterCategory.value) {
        params.set("category", filterCategory.value);
    }

    if (startDate.value) {
        params.set("start_date", startDate.value);
    }

    if (endDate.value) {
        params.set("end_date", endDate.value);
    }

    return params.toString();
}


// Load all expenses for dashboard totals and charts
async function loadAllExpenses() {
    const response = await fetch("/api/expenses");

    if (!response.ok) {
        throw new Error("Unable to load expense records");
    }

    allExpenses = await response.json();

    calculateTotal();
    renderCharts();
    updateBudgetDisplay();
}


// Load filtered expenses for the transaction list
async function loadExpenses() {
    try {
        const query = getFilterQuery();
        const response = await fetch("/api/expenses" + (query ? "?" + query : ""));

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to load expenses");
        }

        expenses = result;
        displayExpenses();

    } catch (error) {
        showToast(error.message, "error");
    }
}


// Refresh dashboard and transaction list
async function refreshApplication() {
    try {
        await loadAllExpenses();
        await loadExpenses();
    } catch (error) {
        console.error(error);
        showToast(error.message, "error");
    }
}


// Display expenses
function displayExpenses() {
    expenseList.innerHTML = "";

    document.getElementById("recentCount").textContent =
        `${expenses.length} records`;

    if (expenses.length === 0) {
        expenseList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">₹</div>
                <h3>No matching expenses</h3>
                <p>Try changing your search or filters.</p>
            </div>
        `;
        return;
    }

    expenses.forEach(expense => {
        const item = document.createElement("div");
        item.className = "expense-item";

        const left = document.createElement("div");
        left.className = "expense-left";

        const icon = document.createElement("div");
        icon.className = "expense-category-icon";
        icon.textContent = getCategoryIcon(expense.category);

        const details = document.createElement("div");
        details.className = "expense-details";

        const name = document.createElement("h3");
        name.textContent = expense.name;

        const meta = document.createElement("div");
        meta.className = "expense-meta";

        const pill = document.createElement("span");
        pill.className = "category-pill";
        pill.textContent = expense.category;

        const date = document.createElement("span");
        date.textContent = formatDate(expense.date);

        meta.append(pill, date);
        details.append(name, meta);
        left.append(icon, details);

        const right = document.createElement("div");
        right.className = "expense-right";

        const price = document.createElement("div");
        price.className = "expense-amount";
        price.textContent = formatCurrency(expense.amount);

        const actions = document.createElement("div");
        actions.className = "expense-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editExpense(expense.id));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => askDeleteConfirmation(expense.id));

        actions.append(editButton, deleteButton);
        right.append(price, actions);

        item.append(left, right);
        expenseList.appendChild(item);
    });
}


// Category icons
function getCategoryIcon(categoryName) {
    const icons = {
        Food: "🍕",
        Travel: "🚕",
        Shopping: "🛍️",
        Education: "📚",
        Bills: "🧾",
        Entertainment: "🎬",
        Health: "💊",
        Other: "💳"
    };

    return icons[categoryName] || "💳";
}


// Dashboard totals use all expenses, not just filtered results
function calculateTotal() {
    let total = 0;
    let monthlyTotal = 0;

    const currentMonth = getCurrentMonth();

    allExpenses.forEach(expense => {
        total += Number(expense.amount);

        if (expense.date.slice(0, 7) === currentMonth) {
            monthlyTotal += Number(expense.amount);
        }
    });

    totalExpenses.textContent = formatCurrency(total);
    monthlyExpenses.textContent = formatCurrency(monthlyTotal);
    totalTransactions.textContent = allExpenses.length;
}


// Add or update expense
expenseForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const expenseData = {
        name: expenseName.value.trim(),
        amount: amount.value,
        category: category.value,
        date: expenseDate.value
    };

    if (!expenseData.name || !expenseData.amount ||
        !expenseData.category || !expenseData.date ||
        Number(expenseData.amount) <= 0) {
        showToast("Please enter valid expense details", "error");
        return;
    }

    try {
        let url = "/api/expenses";
        let method = "POST";

        if (editingExpenseId !== null) {
            url = `/api/expenses/${editingExpenseId}`;
            method = "PUT";
        }

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expenseData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Something went wrong");
        }

        const wasEditing = editingExpenseId !== null;

        resetForm();
        await refreshApplication();

        showToast(wasEditing
            ? "Expense updated successfully"
            : "Expense added successfully");

    } catch (error) {
        showToast(error.message, "error");
    }
});


// Edit expense
function editExpense(id) {
    const expense = allExpenses.find(item => item.id === id);

    if (!expense) {
        showToast("Expense not found", "error");
        return;
    }

    editingExpenseId = id;

    expenseName.value = expense.name;
    amount.value = expense.amount;
    category.value = expense.category;
    expenseDate.value = expense.date;

    submitButton.textContent = "✓ Update Expense";
    cancelButton.hidden = false;
    formHeading.textContent = "Edit your expense";

    document.getElementById("add-expense").scrollIntoView({
        behavior: "smooth"
    });
}


// Reset form
function resetForm() {
    expenseForm.reset();
    editingExpenseId = null;

    submitButton.textContent = "＋ Add Expense";
    cancelButton.hidden = true;
    formHeading.textContent = "Add a new expense";

    setTodayDate();
}

cancelButton.addEventListener("click", resetForm);


// Delete confirmation
function askDeleteConfirmation(id) {
    deletingExpenseId = id;
    confirmOverlay.hidden = false;
}

keepExpenseButton.addEventListener("click", function() {
    deletingExpenseId = null;
    confirmOverlay.hidden = true;
});

confirmOverlay.addEventListener("click", function(event) {
    if (event.target === confirmOverlay) {
        deletingExpenseId = null;
        confirmOverlay.hidden = true;
    }
});


// Delete expense
confirmDeleteButton.addEventListener("click", async function() {
    if (deletingExpenseId === null) return;

    const id = deletingExpenseId;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not delete expense");
        }

        deletingExpenseId = null;
        confirmOverlay.hidden = true;

        if (editingExpenseId === id) resetForm();

        await refreshApplication();
        showToast("Expense deleted successfully");

    } catch (error) {
        confirmOverlay.hidden = true;
        deletingExpenseId = null;
        showToast(error.message, "error");
    }
});


// Category chart
function createCategoryChart() {
    const totals = {};

    allExpenses.forEach(expense => {
        const name = expense.category;
        totals[name] = (totals[name] || 0) + Number(expense.amount);
    });

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: "doughnut",
        data: {
            labels: Object.keys(totals),
            datasets: [{
                data: Object.values(totals),
                backgroundColor: [
                    "#7569E8", "#21A67A", "#F1A34A", "#E66B83",
                    "#4B9DD5", "#9B79CE", "#55B9B2", "#A5AABD"
                ],
                borderWidth: 3,
                borderColor: "#ffffff",
                hoverOffset: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 18,
                        font: { family: "DM Sans", size: 11 }
                    }
                }
            }
        }
    });
}


// Monthly spending chart
function createMonthlyChart() {
    const monthlyTotals = {};

    allExpenses.forEach(expense => {
        const month = expense.date.slice(0, 7);
        monthlyTotals[month] =
            (monthlyTotals[month] || 0) + Number(expense.amount);
    });

    const sortedMonths = Object.keys(monthlyTotals).sort();

    const labels = sortedMonths.map(month => {
        const [year, monthNumber] = month.split("-");
        return new Date(Number(year), Number(monthNumber) - 1)
            .toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            });
    });

    const values = sortedMonths.map(month => monthlyTotals[month]);

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(document.getElementById("monthlyChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Spending",
                data: values,
                backgroundColor: "#8175E9",
                borderRadius: 7,
                maxBarThickness: 45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        }
    });
}


function renderCharts() {
    createCategoryChart();
    createMonthlyChart();
}


// Monthly budget calculations
function getMonthlySpending(month) {
    return allExpenses.reduce((total, expense) => {
        if (expense.date.slice(0, 7) === month) {
            return total + Number(expense.amount);
        }
        return total;
    }, 0);
}


async function loadBudget() {
    const month = budgetMonth.value;
    if (!month) return;

    try {
        const response = await fetch(`/api/budget/${month}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load budget");
        }

        budgetAmount.value = data.amount || "";
        updateBudgetDisplay(data.amount || 0);

    } catch (error) {
        showToast(error.message, "error");
    }
}


function updateBudgetDisplay(budget) {
    const month = budgetMonth.value;
    const spent = getMonthlySpending(month);
    const remaining = budget - spent;

    const percentage = budget > 0 ? (spent / budget) * 100 : 0;

    budgetTotal.textContent = formatCurrency(budget);
    budgetSpent.textContent = formatCurrency(spent);
    budgetRemaining.textContent = formatCurrency(remaining);
    budgetPercentage.textContent = Math.round(percentage) + "%";

    budgetProgressBar.style.width = Math.min(percentage, 100) + "%";
    budgetProgressBar.className = "";

    if (budget <= 0) {
        budgetStatus.textContent = "Set a budget to get started";
        budgetProgressBar.style.width = "0%";
    } else if (percentage >= 100) {
        budgetStatus.textContent = "Budget exceeded!";
        budgetProgressBar.classList.add("over-budget");
    } else if (percentage >= 80) {
        budgetStatus.textContent = "Warning: You are close to your limit";
        budgetProgressBar.classList.add("warning-budget");
    } else {
        budgetStatus.textContent = "You are within your budget";
        budgetProgressBar.classList.add("safe-budget");
    }
}


// Save budget
document.getElementById("saveBudget").addEventListener("click", async function() {
    const month = budgetMonth.value;
    const amountValue = Number(budgetAmount.value);

    if (!month || !Number.isFinite(amountValue) || amountValue <= 0) {
        showToast("Enter a valid month and budget", "error");
        return;
    }

    try {
        const response = await fetch("/api/budget", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                month,
                amount: amountValue
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save budget");
        }

        updateBudgetDisplay(amountValue);
        showToast("Monthly budget saved successfully");

    } catch (error) {
        showToast(error.message, "error");
    }
});

budgetMonth.addEventListener("change", loadBudget);


// Search and filters
function applyFilters() {
    loadExpenses();
}

searchInput.addEventListener("input", function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
});

filterCategory.addEventListener("change", applyFilters);
startDate.addEventListener("change", applyFilters);
endDate.addEventListener("change", applyFilters);


// Clear all filters
document.getElementById("clearFilters").addEventListener("click", function() {
    searchInput.value = "";
    filterCategory.value = "";
    startDate.value = "";
    endDate.value = "";
    loadExpenses();
});


// Export currently filtered records
document.getElementById("exportButton").addEventListener("click", function() {
    const query = getFilterQuery();
    const url = "/api/expenses/export" + (query ? "?" + query : "");
    window.location.href = url;
});


// Navigation highlighting
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function() {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");
    });
});


// Start application
async function initializeApp() {
    setTodayDate();
    budgetMonth.value = getCurrentMonth();

    await refreshApplication();
    await loadBudget();
}

initializeApp();
