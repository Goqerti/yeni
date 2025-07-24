document.addEventListener('DOMContentLoaded', () => {
    const showPasswordCheckbox = document.getElementById('show-password');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('error-message');

    // Şifrəni göstər/gizlə
    if (showPasswordCheckbox && passwordInput) {
        showPasswordCheckbox.addEventListener('change', () => {
            passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
        });
    }

    // URL-dən xəta mesajını yoxla
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        errorMessageDiv.textContent = 'İstifadəçi adı və ya şifrə yanlışdır.';
        errorMessageDiv.style.display = 'block';
    }

    // Animasiya üçün buludları yarat
    const animationContainer = document.getElementById('animation-container');
    if (animationContainer) {
        const cloudCount = 15; // Buludların sayı
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            
            const size = Math.random() * 150 + 50; // 50px - 200px arası ölçü
            const top = Math.random() * 80; // 0% - 80% arası hündürlük
            const duration = Math.random() * 50 + 30; // 30s - 80s arası hərəkət müddəti
            const delay = Math.random() * 30; // 0s - 30s arası başlama gecikməsi

            cloud.style.width = `${size}px`;
            cloud.style.height = `${size * 0.6}px`;
            cloud.style.top = `${top}%`;
            cloud.style.animationDuration = `${duration}s`;
            cloud.style.animationDelay = `-${delay}s`;
            
            cloud.style.left = `${Math.random() * -500}px`;

            animationContainer.appendChild(cloud);
        }
        
        // Paraşütlərin yaradılması məntiqi
        const parachuteSVG = `
            <svg class="parachute-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M 10 50 A 40 20 0 1 1 90 50" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
                <path d="M 50 50 L 30 90" stroke="#8B4513" stroke-width="1"/>
                <path d="M 50 50 L 70 90" stroke="#8B4513" stroke-width="1"/>
                <path d="M 50 50 L 50 90" stroke="#8B4513" stroke-width="1"/>
            </svg>
        `;
        
        const triggerParachuteDrop = () => {
            const planeContainer = document.querySelector('.plane-container');
            if (!planeContainer) return;

            const planeRect = planeContainer.getBoundingClientRect();

            if (planeRect.left > 0 && planeRect.right < window.innerWidth) {
                const parachute = document.createElement('div');
                parachute.className = 'parachute-drop';
                
                parachute.innerHTML = `
                    ${parachuteSVG}
                    <img src="images/mascot.png" alt="Logo" class="logo-payload">
                `;
                
                parachute.style.left = `${planeRect.left + (planeRect.width / 2) - 50}px`;
                parachute.style.top = `${planeRect.bottom}px`;
                
                animationContainer.appendChild(parachute);
                
                parachute.addEventListener('animationend', () => {
                    parachute.remove();
                });
            }
        };

        setInterval(triggerParachuteDrop, 8000);
    }

    // --- Yeni İstifadəçi Yaratma Modalı Məntiqi ---
    const showCreateUserModalBtn = document.getElementById('showCreateUserModalBtn');
    const createUserModal = document.getElementById('createUserModal');
    const closeCreateUserModalBtn = createUserModal.querySelector('.close-button');
    const ownerAccessPrompt = document.getElementById('ownerAccessPrompt');
    const addUserFormContainer = document.getElementById('addUserFormContainer');
    const ownerAccessForm = document.getElementById('ownerAccessForm');
    const addUserForm = document.getElementById('addUserForm');
    const modalMessage = document.getElementById('modalMessage');

    const showModalMessage = (message, isSuccess) => {
        modalMessage.textContent = message;
        modalMessage.className = `modal-message ${isSuccess ? 'success' : 'error'}`;
        modalMessage.style.display = 'block';
    };

    const resetModal = () => {
        ownerAccessPrompt.style.display = 'block';
        addUserFormContainer.style.display = 'none';
        modalMessage.style.display = 'none';
        ownerAccessForm.reset();
        addUserForm.reset();
    };

    showCreateUserModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetModal();
        createUserModal.classList.add('is-open');
    });

    closeCreateUserModalBtn.addEventListener('click', () => {
        createUserModal.classList.remove('is-open');
    });

    ownerAccessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('ownerPassword').value;
        try {
            const response = await fetch('/api/verify-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            ownerAccessPrompt.style.display = 'none';
            addUserFormContainer.style.display = 'block';
            modalMessage.style.display = 'none';
        } catch (error) {
            showModalMessage(error.message || 'Parol təsdiqlənərkən xəta baş verdi.', false);
        }
    });

    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            username: document.getElementById('newUsername').value,
            displayName: document.getElementById('newDisplayName').value,
            email: document.getElementById('newEmail').value,
            password: document.getElementById('newPassword').value,
            role: document.getElementById('newRole').value
        };

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showModalMessage(result.message, true);
            setTimeout(() => {
                createUserModal.classList.remove('is-open');
            }, 2000);

        } catch (error) {
            showModalMessage(error.message || 'İstifadəçi yaradılarkən xəta baş verdi.', false);
        }
    });
});
