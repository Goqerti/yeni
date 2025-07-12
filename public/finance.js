// public/finance.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementləri ---
    const expensesTableBody = document.getElementById('expensesTableBody');
    const modal = document.getElementById('expenseModal');
    const showModalBtn = document.getElementById('showAddExpenseModalBtn');
    const closeModalBtn = modal.querySelector('.close-button');
    const expenseForm = document.getElementById('expenseForm');
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const expenseIdInput = document.getElementById('expenseId');
    const totalAmountSpan = document.getElementById('totalAmount');
    const detailsModal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    const closeDetailsModalBtn = detailsModal.querySelector('.close-button');
    const costInputs = modal.querySelectorAll('.cost-input');

    // Detallı axtarış üçün elementlər
    const filterCategorySelect = document.getElementById('filterCategory');
    const filterMonthInput = document.getElementById('filterMonth');
    const filterExpensesBtn = document.getElementById('filterExpensesBtn');
    const filteredExpensesTableBody = document.getElementById('filteredExpensesTableBody');

    // --- XƏRC PAKETLƏRİ ÜÇÜN FUNKSİYALAR ---
    const fetchAndRenderPackages = async () => {
        try {
            const response = await fetch('/api/expenses');
            if (!response.ok) {
                if(response.status === 403) {
                    alert('Bu bölməyə giriş icazəniz yoxdur.');
                    window.location.href = '/';
                    return;
                }
                throw new Error('Xərc paketləri yüklənə bilmədi.');
            }
            const packages = await response.json();
            renderPackagesTable(packages);
        } catch (error) {
            if (expensesTableBody) {
                expensesTableBody.innerHTML = `<tr><td colspan="4" class="error-message">${error.message}</td></tr>`;
            }
        }
    };

    const renderPackagesTable = (packages) => {
        if (!expensesTableBody) return;
        expensesTableBody.innerHTML = '';
        if (packages.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Heç bir xərc paketi əlavə edilməyib.</td></tr>`;
            return;
        }
        packages.forEach(pkg => {
            const row = expensesTableBody.insertRow();
            row.insertCell().textContent = new Date(pkg.creationTimestamp).toLocaleDateString('az-AZ');
            row.insertCell().textContent = `${pkg.totalAmount.toFixed(2)} ${pkg.currency}`;
            row.insertCell().textContent = pkg.createdBy;
            const actionsCell = row.insertCell();
            const detailsButton = document.createElement('button');
            detailsButton.className = 'action-btn note';
            detailsButton.innerHTML = '📄';
            detailsButton.title = 'Detallara bax';
            detailsButton.onclick = () => showDetailsModal(pkg);
            actionsCell.appendChild(detailsButton);
            const editButton = document.createElement('button');
            editButton.className = 'action-btn edit';
            editButton.innerHTML = '✏️';
            editButton.title = 'Düzəliş et';
            editButton.onclick = () => openModalForEdit(pkg);
            actionsCell.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn delete';
            deleteButton.innerHTML = '🗑️';
            deleteButton.title = 'Sil';
            deleteButton.onclick = () => handleDeletePackage(pkg.id);
            actionsCell.appendChild(deleteButton);
        });
    };

    // --- FİLTRLƏNMİŞ XƏRCLƏR ÜÇÜN FUNKSİYALAR ---
    const handleFilterExpenses = async () => {
        const category = filterCategorySelect.value;
        const month = filterMonthInput.value;

        if (!category || !month) {
            alert("Zəhmət olmasa, həm kateqoriya, həm də ay/il seçin.");
            return;
        }
        
        if (filteredExpensesTableBody) {
            filteredExpensesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Yüklənir...</td></tr>`;
        }

        try {
            const response = await fetch(`/api/expenses/filter?category=${category}&month=${month}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Filterləmə zamanı xəta baş verdi.');
            }
            const filteredExpenses = await response.json();
            renderFilteredExpensesTable(filteredExpenses);
        } catch (error) {
            if (filteredExpensesTableBody) {
                filteredExpensesTableBody.innerHTML = `<tr><td colspan="4" class="error-message">${error.message}</td></tr>`;
            }
        }
    };

    const renderFilteredExpensesTable = (expenses) => {
        if (!filteredExpensesTableBody) return;
        filteredExpensesTableBody.innerHTML = '';
        if (expenses.length === 0) {
            filteredExpensesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Seçilmiş filterlərə uyğun xərc tapılmadı.</td></tr>`;
            return;
        }
        expenses.forEach(expense => {
            const row = filteredExpensesTableBody.insertRow();
            row.insertCell().textContent = new Date(expense.date).toLocaleDateString('az-AZ');
            row.insertCell().textContent = `${expense.amount.toFixed(2)} ${expense.currency}`;
            row.insertCell().textContent = expense.comment;
            row.insertCell().textContent = expense.createdBy;
        });
    };

    // --- MODAL VƏ FORM MƏNTİQİ ---
    const calculateTotal = () => {
        let total = 0;
        costInputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        if (totalAmountSpan) {
            totalAmountSpan.textContent = total.toFixed(2);
        }
    };

    const openModalForCreate = () => {
        expenseForm.reset();
        expenseIdInput.value = '';
        modalTitle.textContent = 'Yeni Xərc Paketi';
        submitButton.textContent = 'Paketi Yadda Saxla';
        calculateTotal();
        modal.style.display = 'flex';
    };

    const openModalForEdit = (pkg) => {
        expenseForm.reset();
        expenseIdInput.value = pkg.id;
        
        Object.keys(pkg.details).forEach(key => {
            const amountInput = expenseForm.querySelector(`.cost-input[data-name="${key}"]`);
            const commentInput = expenseForm.querySelector(`input[data-comment-for="${key}"]`);
            if (amountInput) amountInput.value = pkg.details[key].amount || '';
            if (commentInput) commentInput.value = pkg.details[key].comment || '';
        });

        calculateTotal();
        modalTitle.textContent = 'Xərc Paketinə Düzəliş Et';
        submitButton.textContent = 'Dəyişiklikləri Yadda Saxla';
        modal.style.display = 'flex';
    };

    const handleDeletePackage = async (id) => {
        if (!confirm('Bu xərc paketini silmək istədiyinizə əminsiniz?')) return;
        try {
            const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            await fetchAndRenderPackages();
        } catch (error) {
            alert(`Xəta: ${error.message}`);
        }
    };

    const showDetailsModal = (pkg) => {
        let contentHtml = '';
        for(const key in pkg.details) {
            const item = pkg.details[key];
            if(item.amount > 0) {
                 contentHtml += `
                    <div class="info-grid">
                        <strong>${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>
                        <span>${item.amount.toFixed(2)} ${pkg.currency}</span>
                        <strong>Şərh:</strong>
                        <span>${item.comment || '<i>(boş)</i>'}</span>
                    </div><hr class="dashed">`;
            }
        }
        detailsContent.innerHTML = contentHtml || '<p>Bu paketdə heç bir xərc detalı tapılmadı.</p>';
        detailsModal.style.display = 'flex';
    };
    
    // --- HADİSƏ DİNLƏYİCİLƏRİ (Elementin mövcudluğunu yoxlamaqla) ---
    if (costInputs) costInputs.forEach(input => input.addEventListener('input', calculateTotal));
    if (showModalBtn) showModalBtn.addEventListener('click', openModalForCreate);
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (closeDetailsModalBtn) closeDetailsModalBtn.addEventListener('click', () => { detailsModal.style.display = 'none'; });
    
    window.addEventListener('click', (e) => { 
        if (e.target === modal) modal.style.display = 'none'; 
        if (e.target === detailsModal) detailsModal.style.display = 'none';
    });
    
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = expenseIdInput.value;
            const url = id ? `/api/expenses/${id}` : '/api/expenses';
            const method = id ? 'PUT' : 'POST';
            
            const details = {};
            costInputs.forEach(input => {
                const name = input.dataset.name;
                const commentInput = expenseForm.querySelector(`input[data-comment-for="${name}"]`);
                details[name] = {
                    amount: parseFloat(input.value) || 0,
                    comment: commentInput.value.trim()
                };
            });

            const packageData = {
                totalAmount: parseFloat(totalAmountSpan.textContent),
                currency: 'AZN',
                details
            };

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(packageData)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Əməliyyat uğursuz oldu.');
                }
                
                modal.style.display = 'none';
                await fetchAndRenderPackages();

            } catch (error) {
                alert(`Xəta: ${error.message}`);
            }
        });
    }

    if (filterExpensesBtn) {
        filterExpensesBtn.addEventListener('click', handleFilterExpenses);
    }

    // Səhifə yüklənəndə ilkin məlumatları gətir
    if (expensesTableBody) {
        fetchAndRenderPackages();
    }
});
