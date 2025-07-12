// public/permissions.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementləri ---
    const passwordPrompt = document.getElementById('auth-section');
    const permissionsPanel = document.getElementById('permissions-section');
    const verifyOwnerBtn = document.getElementById('verifyOwnerBtn');
    const ownerPasswordInput = document.getElementById('ownerPassword');
    const permissionsTableBody = document.querySelector('#permissionsTable tbody');
    const savePermissionsBtn = document.getElementById('savePermissionsBtn');
    const messageContainer = document.getElementById('message-container');

    // İstifadəçi Redaktə Modalı üçün elementlər
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const editUserModalTitle = document.getElementById('editUserModalTitle');
    const closeEditUserModalBtn = editUserModal.querySelector('.close-button');

    // --- Funksiyalar ---
    const showMessage = (text, type = 'error') => {
        if (!messageContainer) return;
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => messageContainer.innerHTML = '', 4000);
    };

    const openUserEditModal = (user) => {
        if (!editUserForm || !editUserModal) return;
        editUserForm.reset();
        document.getElementById('editUsernameHidden').value = user.username;
        document.getElementById('editDisplayName').value = user.displayName;
        document.getElementById('editEmail').value = user.email;
        editUserModalTitle.textContent = `'${user.displayName}' üçün düzəliş`;
        editUserModal.style.display = 'flex';
    };

    const renderPermissions = (users, permissions) => {
        if (!permissionsTableBody) return;
        permissionsTableBody.innerHTML = '';
        users.forEach(user => {
            if (user.role === 'owner') return;

            const userPerms = permissions[user.username] || {};
            const row = permissionsTableBody.insertRow();
            row.dataset.username = user.username;
            
            row.insertCell().textContent = `${user.displayName} (${user.username})`;
            
            const permKeys = [
                'canEditOrder', 'canDeleteOrder', 'canEditFinancials', 
                'finance_canEditExpenses', 'finance_canEditCompanyOrders', 'finance_canChangePayments',
                'transport_canEdit', 'transport_canDelete'
            ];
            
            permKeys.forEach(key => {
                const cell = row.insertCell();
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.dataset.permission = key;
                checkbox.checked = !!userPerms[key];
                cell.appendChild(checkbox);
            });

            const actionsCell = row.insertCell();
            const editUserBtn = document.createElement('button');
            editUserBtn.className = 'action-btn edit';
            editUserBtn.innerHTML = '✏️';
            editUserBtn.title = 'İstifadəçi məlumatlarını redaktə et';
            editUserBtn.onclick = () => openUserEditModal(user);
            actionsCell.appendChild(editUserBtn);
        });
    };

    // --- Hadisə Dinləyiciləri ---
    if (verifyOwnerBtn) {
        verifyOwnerBtn.addEventListener('click', async () => {
            const password = ownerPasswordInput.value;
            if (!password) {
                showMessage('Zəhmət olmasa, parolu daxil edin.');
                return;
            }
            try {
                const requestBody = { password };
                const [usersResponse, permsResponse] = await Promise.all([
                    fetch('/api/users/get-by-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }),
                    fetch('/api/permissions/get-by-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) })
                ]);

                if (!usersResponse.ok) throw new Error((await usersResponse.json()).message || 'İstifadəçi siyahısı yüklənə bilmədi.');
                if (!permsResponse.ok) throw new Error((await permsResponse.json()).message || 'İcazələri yükləmək mümkün olmadı.');

                const users = await usersResponse.json();
                const permissions = await permsResponse.json();

                if (passwordPrompt) passwordPrompt.style.display = 'none';
                if (permissionsPanel) permissionsPanel.style.display = 'block';
                renderPermissions(users, permissions);
            } catch (error) {
                showMessage(error.message);
            }
        });
    }

    if (savePermissionsBtn) {
        savePermissionsBtn.addEventListener('click', async () => {
            const password = ownerPasswordInput.value;
            const newPermissions = {};
            document.querySelectorAll('#permissionsTable tbody tr').forEach(row => {
                const username = row.dataset.username;
                newPermissions[username] = {};
                row.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    newPermissions[username][checkbox.dataset.permission] = checkbox.checked;
                });
            });
            
            try {
                const response = await fetch('/api/permissions/save-by-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        password: password, 
                        permissions: newPermissions 
                    })
                });
                
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Yadda saxlama zamanı xəta.');
                
                showMessage('İcazələr uğurla yadda saxlandı.', 'success');
            } catch (error) {
                showMessage(error.message);
            }
        });
    }

    if (closeEditUserModalBtn) closeEditUserModalBtn.addEventListener('click', () => editUserModal.style.display = 'none');
    
    window.addEventListener('click', (e) => { 
        if (editUserModal && e.target === editUserModal) editUserModal.style.display = 'none'; 
    });

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameToUpdate = document.getElementById('editUsernameHidden').value;
            const ownerPassword = ownerPasswordInput.value;
            
            const newUserData = {
                displayName: document.getElementById('editDisplayName').value,
                email: document.getElementById('editEmail').value,
                newPassword: document.getElementById('editNewPassword').value
            };

            try {
                const response = await fetch(`/api/users/update-by-password/${usernameToUpdate}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerPassword, newUserData })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                showMessage('İstifadəçi məlumatları uğurla yeniləndi.', 'success');
                editUserModal.style.display = 'none';
                if (verifyOwnerBtn) verifyOwnerBtn.click();
            } catch (error) {
                showMessage(error.message);
            }
        });
    }
});
