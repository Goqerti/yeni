// public/app.js

document.addEventListener('DOMContentLoaded', async () => {
    // Dil tərcüməsini yüklə
    await i18n.loadTranslations(localStorage.getItem('lang') || 'az');
    i18n.translatePage();

    i18n.setupLanguageSwitcher('lang-switcher-main', () => {
        // Dil dəyişdikdən sonra cədvəlləri yenidən render et
        fetchOrdersAndRender();
        fetchAndRenderDebts();
    });

    // --- Qlobal Dəyişənlər ---
    let currentUserRole = null;
    let currentUserDisplayName = null;
    let currentUserPermissions = {};
    let currentOrders = [];
    let editingOrderId = null;
    let wanderingInterval = null;
    let stealAnimationTimeout = null; 

    // --- DOM Elementləri ---
    const addOrderForm = document.getElementById('addOrderForm');
    const modal = document.getElementById('addOrderModal');
    const showAddOrderFormBtn = document.getElementById('showAddOrderFormBtn');
    const addHotelBtn = document.getElementById('addHotelBtn');
    const hotelEntriesContainer = document.getElementById('hotelEntriesContainer');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const modalTitle = modal?.querySelector('h3');
    const modalSubmitButton = modal?.querySelector('button[type="submit"]');
    const closeButton = modal?.querySelector('.modal-content .close-button');
    const navSatishlarBtn = document.getElementById('navSatishlarBtn');
    const navRezervasiyalarBtn = document.getElementById('navRezervasiyalarBtn');
    const navAxtarishBtn = document.getElementById('navAxtarishBtn');
    const navHesabatBtn = document.getElementById('navHesabatBtn');
    const navBildirishlerBtn = document.getElementById('navBildirishlerBtn');
    const navChatBtn = document.getElementById('navChatBtn');
    const navBorclarBtn = document.getElementById('navBorclarBtn');
    const navTransportBtn = document.getElementById('navTransportBtn');
    const navTasksBtn = document.getElementById('navTasksBtn');
    const satishlarView = document.getElementById('satishlarView');
    const rezervasiyalarView = document.getElementById('rezervasiyalarView');
    const bildirishlerView = document.getElementById('bildirishlerView');
    const chatView = document.getElementById('chatView');
    const searchView = document.getElementById('searchView');
    const hesabatView = document.getElementById('hesabatView');
    const borclarView = document.getElementById('borclarView');
    const searchInputRezNomresi = document.getElementById('searchInputRezNomresi');
    const searchButton = document.getElementById('searchButton');
    const searchResultDisplay = document.getElementById('searchResultDisplay');
    const noteModal = document.getElementById('noteModal');
    const closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    const noteForm = document.getElementById('noteForm');
    const noteSatisNoInput = document.getElementById('noteSatisNo');
    const noteTextInput = document.getElementById('noteText');
    const noteModalTitle = document.getElementById('noteModalTitle');
    const notificationsTableBody = document.getElementById('notificationsTableBody');
    const notificationCountBadge = document.getElementById('notification-count');
    const tasksCountBadge = document.getElementById('tasks-count');
    const reservationsTableBody = document.getElementById('reservationsTableBody');
    const reservationFilterHotelNameInput = document.getElementById('reservationFilterHotelName');
    const reservationFilterMonthInput = document.getElementById('reservationFilterMonth');
    const reservationFilterDateInput = document.getElementById('reservationFilterDate');
    const applyReservationFiltersBtn = document.getElementById('applyReservationFiltersBtn');
    const resetReservationFiltersBtn = document.getElementById('resetReservationFiltersBtn');
    const reportResultDisplay = document.getElementById('reportResultDisplay');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const filterRezNoInput = document.getElementById('filterRezNo');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalsByCurrencyContainer = document.getElementById('totalsByCurrencyContainer');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const borclarSearchInput = document.getElementById('borclarSearchInput');
    const borclarSearchBtn = document.getElementById('borclarSearchBtn');
    const borclarTableBody = document.getElementById('borclarTableBody');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsPanelBtn = document.getElementById('closeSettingsPanelBtn');
    const mascotOnBtn = document.getElementById('mascotOnBtn');
    const mascotOffBtn = document.getElementById('mascotOffBtn');
    const mascotContainer = document.getElementById('mascot-container');
    const mascotBubble = document.getElementById('mascot-bubble');
    const companyFilterSelect = document.getElementById('companyFilterSelect');
    const getCompanyReportBtn = document.getElementById('getCompanyReportBtn');
    const companyReportResult = document.getElementById('companyReportResult');
    const companyReportSummary = document.getElementById('companyReportSummary');
    const adultGuestsInput = document.getElementById('adultGuests');
    const childGuestsInput = document.getElementById('childGuests');
    const touristsContainer = document.getElementById('touristsContainer');

    // --- İstifadəçi Məlumatları və İcazələrin Yüklənməsi ---
    try {
        const [userRes, permsRes] = await Promise.all([
            fetch('/api/user/me'),
            fetch('/api/user/permissions')
        ]);
        if (!userRes.ok || !permsRes.ok) {
            window.location.href = '/login.html';
            return;
        }
        const user = await userRes.json();
        currentUserRole = user.role;
        currentUserDisplayName = user.displayName;
        currentUserPermissions = await permsRes.json();
        
        const headerTitle = document.getElementById('main-header-title');
        if (headerTitle && currentUserDisplayName) {
            headerTitle.textContent = currentUserDisplayName;
        }
        
        if (currentUserRole === 'owner' || currentUserRole === 'finance') {
             const navFinanceBtn = document.getElementById('navFinanceBtn');
             if (navFinanceBtn) navFinanceBtn.style.display = 'inline-block';
             if (navTransportBtn) navTransportBtn.style.display = 'inline-block';
        }

    } catch (error) {
        console.error('Giriş bilgileri veya izinler alınamadı:', error);
        window.location.href = '/login.html';
        return;
    }
    
    // --- TƏNZİMLƏMƏLƏR PANELİ MƏNTİQİ ---
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('visible');
        });
        if(closeSettingsPanelBtn) {
            closeSettingsPanelBtn.addEventListener('click', () => {
                settingsPanel.classList.remove('visible');
            });
        }
        document.addEventListener('click', (e) => {
            if (settingsPanel && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('visible');
            }
        });
    }

    function updateMascotButtons(isMascotEnabled) {
        if (!mascotOnBtn || !mascotOffBtn) return;
        if (isMascotEnabled) {
            mascotOnBtn.classList.add('active');
            mascotOffBtn.classList.remove('active');
            if (mascotContainer) mascotContainer.style.display = 'block';
        } else {
            mascotOffBtn.classList.add('active');
            mascotOnBtn.classList.remove('active');
            if (mascotContainer) mascotContainer.style.display = 'none';
        }
    }
    
    if (mascotOnBtn && mascotOffBtn) {
        mascotOnBtn.addEventListener('click', () => {
            localStorage.setItem('mascot_enabled', 'true');
            updateMascotButtons(true);
        });
        mascotOffBtn.addEventListener('click', () => {
            localStorage.setItem('mascot_enabled', 'false');
            updateMascotButtons(false);
        });
    }
    
    let isMascotEnabled = localStorage.getItem('mascot_enabled') !== 'false';
    updateMascotButtons(isMascotEnabled);
    
    // --- MASKOT FUNKSİYALARI ---
    const stopMascotLifeCycle = () => { if (wanderingInterval) { clearInterval(wanderingInterval); wanderingInterval = null; }};
    const startMascotLifeCycle = () => {
        if (wanderingInterval || !mascotContainer) return;
        wanderingInterval = setInterval(() => {
            if (localStorage.getItem('mascot_enabled') === 'false') return;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const mascotWidth = mascotContainer.offsetWidth;
            const mascotHeight = mascotContainer.offsetHeight;
            const maxX = screenWidth - mascotWidth;
            const minX = screenWidth - 400; 
            const maxY = screenHeight - mascotHeight;
            const minY = screenHeight - 300;
            const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
            const randomY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
            mascotContainer.style.transform = `translate(${randomX - (screenWidth - mascotWidth - 20)}px, ${randomY - (screenHeight - mascotHeight - 20)}px)`;
        }, 5000);
    };
    const resetMascotPosition = () => {
        if (!mascotContainer) return;
        stopMascotLifeCycle();
        mascotContainer.style.transition = 'transform 1.5s ease-in-out';
        mascotContainer.style.transform = 'translate(0, 0)';
        updateMascotBubble("Gününüz uğurlu keçsin!");
        startMascotLifeCycle();
    };
    const moveMascotToElement = (element, message) => {
        if (!element || localStorage.getItem('mascot_enabled') === 'false') return;
        stopMascotLifeCycle();
        const rect = element.getBoundingClientRect();
        const mascotWidth = mascotContainer.offsetWidth;
        const targetX = rect.left - mascotWidth + 20;
        const targetY = rect.top - 100;
        mascotContainer.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        mascotContainer.style.transform = `translate(${targetX}px, ${targetY}px)`;
        updateMascotBubble(message);
    };
    const updateMascotBubble = (message) => {
        if (!mascotBubble || localStorage.getItem('mascot_enabled') === 'false') return;
        if (message) {
            mascotBubble.textContent = message;
            mascotBubble.classList.add('visible');
        } else {
            mascotBubble.classList.remove('visible');
        }
    };
    
    // --- ƏSAS FUNKSİYALAR ---

    const updateTouristNameInputs = (tourists = []) => {
        if (!touristsContainer) return;
        const adults = parseInt(adultGuestsInput.value) || 0;
        const children = parseInt(childGuestsInput.value) || 0;
        const totalGuests = adults + children;
        touristsContainer.innerHTML = '';
        for (let i = 0; i < totalGuests; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'form-group';
            const label = document.createElement('label');
            label.textContent = `Turist ${i + 1} Adı Soyadı:`;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tourist-name-input';
            input.name = `tourist_${i}`;
            input.required = true;
            input.placeholder = `Turist ${i + 1}`;
            if (tourists[i]) {
                input.value = tourists[i];
            }
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            touristsContainer.appendChild(inputGroup);
        }
    };

    const addHotelEntry = (hotel = {}) => {
        if (!hotelEntriesContainer) return;
        const entryId = `hotel-entry-${Date.now()}${Math.random()}`;
        const hotelEntryDiv = document.createElement('div');
        hotelEntryDiv.className = 'hotel-entry';
        hotelEntryDiv.id = entryId;
        
        hotelEntryDiv.innerHTML = `
            <div class="form-group-inline">
                <input type="text" class="hotel_otelAdi" placeholder="Otel Adı" value="${hotel.otelAdi || ''}">
                <input type="number" step="0.01" class="hotel-price-input cost-input" placeholder="Qiymət" value="${hotel.qiymet || 0}">
                <button type="button" class="action-btn-small remove-hotel-btn">-</button>
            </div>
            <div class="form-group-inline">
                <input type="text" class="hotel_otaqKategoriyasi" placeholder="Otaq Kateqoriyası" value="${hotel.otaqKategoriyasi || ''}">
            </div>
            <div class="form-group-inline">
                <div><label>Giriş Tarixi:</label><input type="date" class="hotel_girisTarixi" value="${hotel.girisTarixi || ''}"></div>
                <div><label>Çıxış Tarixi:</label><input type="date" class="hotel_cixisTarixi" value="${hotel.cixisTarixi || ''}"></div>
            </div>
            <div class="file-upload-wrapper">
                <label for="file-upload-${entryId}" class="file-upload-label">Sənəd Seç</label>
                <input type="file" id="file-upload-${entryId}" class="hotel-confirmation-upload" accept="image/*,application/pdf">
                <span class="file-status"></span>
                <a href="${hotel.confirmationPath || '#'}" class="view-confirmation" target="_blank" style="display: ${hotel.confirmationPath ? 'inline-flex' : 'none'};" title="Sənədə Bax">🔗</a>
                <input type="hidden" class="hotel-confirmation-path" value="${hotel.confirmationPath || ''}">
            </div>
            <hr class="dashed">
        `;
        hotelEntriesContainer.appendChild(hotelEntryDiv);
    };
    
    const calculateGelir = (order) => {
        const alishAmount = order.alish?.amount || 0;
        const satishAmount = order.satish?.amount || 0;
        if (order.alish?.currency === order.satish?.currency) {
            return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)), currency: order.satish.currency };
        }
        return { amount: 0, currency: 'N/A', note: 'Fərqli valyutalar' };
    };

    const calculateTotalCost = () => {
        let total = 0;
        document.querySelectorAll('#addOrderForm .cost-input').forEach(input => {
            if (!input.disabled) {
                total += parseFloat(input.value) || 0;
            }
        });
        const alishAmountInput = document.getElementById('alishAmount');
        if (alishAmountInput) alishAmountInput.value = total.toFixed(2);
    };

    const resetModalToCreateMode = () => {
        try {
            if (addOrderForm) addOrderForm.reset();
            if (hotelEntriesContainer) hotelEntriesContainer.innerHTML = '';
            addHotelEntry();
            calculateTotalCost();
            if (modalTitle) modalTitle.textContent = i18n.t('modalTitleNewOrder');
            if (modalSubmitButton) modalSubmitButton.textContent = i18n.t('addOrderButton');
            editingOrderId = null;
            document.querySelectorAll('#addOrderForm input, #addOrderForm select, #addOrderForm textarea').forEach(el => el.disabled = false);
            
            const alishAmountInput = document.getElementById('alishAmount');
            if(alishAmountInput) alishAmountInput.readOnly = true;

            updateTouristNameInputs();
        } catch (error) {
            console.error("Sifariş forması sıfırlanarkən xəta:", error);
            alert("Sifariş forması hazırlanarkən xəta baş verdi. Zəhmət olmasa, konsola baxın.");
        }
    };
    
    const fetchOrdersAndRender = async () => {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error(i18n.t('errorLoadingOrders'));
            currentOrders = await response.json();
            
            const filterRezNo = filterRezNoInput.value.trim().toLowerCase();
            const filterDate = document.getElementById('filterDate').value;
            const filterMonth = document.getElementById('filterMonth').value;
            const filterYear = document.getElementById('filterYear').value;

            let filteredOrders = currentOrders;

            if (filterRezNo) {
                filteredOrders = filteredOrders.filter(o => o.rezNomresi?.toLowerCase().includes(filterRezNo));
            }
            if(filterDate){
                filteredOrders = filteredOrders.filter(o => o.creationTimestamp.startsWith(filterDate));
            } else if (filterMonth){
                filteredOrders = filteredOrders.filter(o => o.creationTimestamp.startsWith(filterMonth));
            } else if (filterYear){
                 filteredOrders = filteredOrders.filter(o => new Date(o.creationTimestamp).getFullYear() == filterYear);
            }

            renderOrdersTable(filteredOrders);
        } catch (error) {
            console.error('Sifarişlər yüklənərkən xəta:', error);
            if (ordersTableBody) ordersTableBody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    };
    
    const renderOrdersTable = (orders, targetTbodyId = 'ordersTableBody') => {
        const tableBody = document.getElementById(targetTbodyId);
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        orders.sort((a, b) => {
            const getCheckInDate = (order) => {
                if (order.hotels && order.hotels.length > 0 && order.hotels[0].girisTarixi) {
                    return new Date(order.hotels[0].girisTarixi);
                }
                return null;
            };

            const dateA = getCheckInDate(a);
            const dateB = getCheckInDate(b);

            const isAFuture = dateA && dateA >= today;
            const isBFuture = dateB && dateB >= today;

            if (isAFuture && isBFuture) return dateA - dateB;
            if (isAFuture) return -1;
            if (isBFuture) return 1;
            return new Date(b.creationTimestamp) - new Date(a.creationTimestamp);
        });

        if (targetTbodyId === 'ordersTableBody') {
            const totals = { AZN: { alish: 0, satish: 0, gelir: 0, debt: 0 }, USD: { alish: 0, satish: 0, gelir: 0, debt: 0 }, EUR: { alish: 0, satish: 0, gelir: 0, debt: 0 }};
            if (totalOrdersEl) totalOrdersEl.textContent = orders.length;

            orders.forEach(order => {
                ['alish', 'satish'].forEach(type => {
                    const data = order[type] || { amount: 0 };
                    if (data.currency && totals[data.currency] && typeof data.amount === 'number') {
                        totals[data.currency][type] += data.amount;
                    }
                });
                const gelir = calculateGelir(order);
                if(gelir.currency && totals[gelir.currency] && !gelir.note){
                    totals[gelir.currency].gelir += gelir.amount;
                }
                if ((!order.paymentStatus || order.paymentStatus === 'Ödənilməyib') && order.satish?.currency && totals[order.satish.currency]) {
                    totals[order.satish.currency].debt += (order.satish.amount || 0);
                }
            });

            if (totalsByCurrencyContainer) {
                totalsByCurrencyContainer.innerHTML = '';
                Object.keys(totals).forEach(currency => {
                    if (totals[currency].alish || totals[currency].satish || totals[currency].gelir || totals[currency].debt) {
                        const currencyCard = document.createElement('div');
                        currencyCard.className = 'currency-card';
                        currencyCard.innerHTML = `<h4>Yekun (${currency})</h4><p><span>Alış:</span> <strong>${totals[currency].alish.toFixed(2)}</strong></p><p><span>Satış:</span> <strong>${totals[currency].satish.toFixed(2)}</strong></p><p><span>Gəlir:</span> <strong class="${totals[currency].gelir < 0 ? 'text-danger' : 'text-success'}">${totals[currency].gelir.toFixed(2)}</strong></p><p><span>Borclar:</span> <strong class="text-danger">${totals[currency].debt.toFixed(2)}</strong></p>`; 
                        totalsByCurrencyContainer.appendChild(currencyCard);
                    }
                });
            }
        }

        if (orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="15" style="text-align:center;">Heç bir sifariş tapılmadı.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const row = tableBody.insertRow();
            let cellIndex = 0;
            
            row.insertCell(cellIndex++).textContent = order.satisNo || '-';
            row.insertCell(cellIndex++).textContent = new Date(order.creationTimestamp).toLocaleString('az-AZ');
            row.insertCell(cellIndex++).textContent = order.rezNomresi || '-';

            const touristCell = row.insertCell(cellIndex++);
            if (Array.isArray(order.tourists) && order.tourists.length > 0) {
                let displayText = order.tourists[0];
                if (order.tourists.length > 1) {
                    displayText += ` (+${order.tourists.length - 1})`;
                }
                touristCell.textContent = displayText;
            } else {
                touristCell.textContent = order.turist || '-';
            }

            row.insertCell(cellIndex++).textContent = order.adultGuests || '0';
            row.insertCell(cellIndex++).textContent = order.childGuests || '0';
            row.insertCell(cellIndex++).textContent = order.xariciSirket || '-';
            row.insertCell(cellIndex++).textContent = (order.hotels && order.hotels[0]) ? order.hotels[0].otelAdi : '-';
            
            const firstHotel = (order.hotels && order.hotels.length > 0) ? order.hotels[0] : null;
            row.insertCell(cellIndex++).textContent = firstHotel && firstHotel.girisTarixi ? firstHotel.girisTarixi : '-';
            
            row.insertCell(cellIndex++).textContent = `${(order.alish || { amount: 0 }).amount.toFixed(2)} ${(order.alish || {}).currency}`;
            row.insertCell(cellIndex++).textContent = `${(order.satish || { amount: 0 }).amount.toFixed(2)} ${(order.satish || {}).currency}`;
            
            const gelir = calculateGelir(order);
            row.insertCell(cellIndex++).textContent = `${gelir.amount.toFixed(2)} ${gelir.currency}`;
            
            const statusKey = { 'Davam edir': 'statusInProgress', 'Bitdi': 'statusCompleted', 'Ləğv edildi': 'statusCancelled' }[order.status] || 'statusInProgress';
            row.insertCell(cellIndex++).textContent = i18n.t(statusKey);
            
            const operationsCell = row.insertCell(cellIndex++);
            if (currentUserPermissions.canEditOrder) {
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn edit'; editBtn.innerHTML = '✏️';
                editBtn.onclick = () => handleEditOrder(order.satisNo);
                operationsCell.appendChild(editBtn);
            }
            if (currentUserPermissions.canDeleteOrder) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete'; deleteBtn.innerHTML = '🗑️';
                deleteBtn.onclick = () => handleDeleteOrder(order.satisNo);
                operationsCell.appendChild(deleteBtn);
            }

            const noteCell = row.insertCell(cellIndex++);
            const noteBtn = document.createElement('button');
            noteBtn.className = 'action-btn note'; noteBtn.innerHTML = '📄';
            noteBtn.onclick = () => handleShowNoteModal(order.satisNo);
            noteCell.appendChild(noteBtn);
        });
    };

    function handleEditOrder(satisNo) {
        const orderToEdit = currentOrders.find(order => String(order.satisNo) === String(satisNo));
        if (!orderToEdit) return;
        
        resetModalToCreateMode();
        editingOrderId = satisNo;
        
        const setInputValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value !== null && value !== undefined ? value : '';
        };

        setInputValue('xariciSirket', orderToEdit.xariciSirket);
        setInputValue('adultGuests', orderToEdit.adultGuests);
        setInputValue('childGuests', orderToEdit.childGuests);
        setInputValue('vizaSayi', orderToEdit.vizaSayi);
        setInputValue('rezNomresi', orderToEdit.rezNomresi);
        setInputValue('transport_surucuMelumatlari', orderToEdit.transport?.surucuMelumatlari);
        setInputValue('transport_xerci', orderToEdit.transport?.xerci);
        setInputValue('transport_odenisKartMelumatlari', orderToEdit.transport?.odenisKartMelumatlari);
        setInputValue('transport_turTevsiri', orderToEdit.transport?.turTevsiri);
        setInputValue('transport_elaveXidmetler', orderToEdit.transport?.elaveXidmetler);
        setInputValue('status', orderToEdit.status);
        setInputValue('qeyd', orderToEdit.qeyd);
        setInputValue('satishAmount', orderToEdit.satish?.amount);
        setInputValue('satishCurrency', orderToEdit.satish?.currency);
        setInputValue('alishCurrency', orderToEdit.alish?.currency);
        setInputValue('paymentStatus', orderToEdit.paymentStatus);
        setInputValue('paymentDueDate', orderToEdit.paymentDueDate);
        
        updateTouristNameInputs(orderToEdit.tourists || [orderToEdit.turist]);
        
        const costs = orderToEdit.detailedCosts || {};
        document.querySelectorAll('.cost-input[id^="detailedCost_"]').forEach(input => {
            const key = input.id.replace('detailedCost_', '') + 'Xerci';
            input.value = costs[key] || 0;
        });

        if (hotelEntriesContainer) hotelEntriesContainer.innerHTML = '';
        if (orderToEdit.hotels?.length > 0) {
            orderToEdit.hotels.forEach(hotel => addHotelEntry(hotel));
        } else {
            addHotelEntry();
        }
        
        calculateTotalCost();
        
        const isFinancialEditForbidden = !currentUserPermissions.canEditFinancials;
        document.querySelectorAll('.cost-input, .hotel-price-input, #satishAmount, #satishCurrency, #alishCurrency').forEach(field => field.disabled = isFinancialEditForbidden);
        
        if (modalTitle) modalTitle.textContent = i18n.t('modalTitleEditOrder', { satisNo: satisNo });
        if (modalSubmitButton) modalSubmitButton.textContent = i18n.t('saveOrderButton');
        modal.style.display = 'block';
    }

    const handleDeleteOrder = async (satisNo) => {
        if (!confirm(i18n.t('confirmDeleteOrder', { satisNo }))) return;
        try {
            const response = await fetch(`/api/orders/${satisNo}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Sifarişi silmək mümkün olmadı.');
            await fetchOrdersAndRender();
        } catch (error) {
            alert(error.message);
        }
    };

    function handleShowNoteModal(satisNo) {
        const order = currentOrders.find(o => String(o.satisNo) === String(satisNo));
        if (!order) return;
        noteSatisNoInput.value = order.satisNo;
        noteTextInput.value = order.qeyd || '';
        noteModalTitle.textContent = `Sifariş № ${order.satisNo} üçün Qeyd`;
        noteModal.style.display = 'block';
    }

    const populateCompanyFilter = async () => {
        if (!companyFilterSelect) return;
        try {
            const response = await fetch('/api/reports/by-company');
            if (!response.ok) throw new Error('Şirkət siyahısı yüklənə bilmədi.');
            const companies = await response.json();
            companyFilterSelect.innerHTML = '<option value="">-- Şirkət seçin --</option>';
            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                companyFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            companyFilterSelect.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const handleGetCompanyReport = async () => {
        const selectedCompany = companyFilterSelect.value;
        if (!selectedCompany) {
            alert('Zəhmət olmasa, bir şirkət seçin.');
            return;
        }
        companyReportResult.style.display = 'none';
        companyReportSummary.style.display = 'none';
        const tableBody = document.getElementById('companyOrdersTableBody');
        tableBody.innerHTML = '<tr><td colspan="15" style="text-align:center;">Yüklənir...</td></tr>';
        companyReportResult.style.display = 'block';
        try {
            const response = await fetch(`/api/reports/by-company?company=${encodeURIComponent(selectedCompany)}`);
            if (!response.ok) throw new Error('Sifarişlər yüklənərkən xəta baş verdi.');
            const { orders, summary } = await response.json();
            renderCompanySummary(summary, selectedCompany);
            renderOrdersTable(orders, 'companyOrdersTableBody');
        } catch (error) {
            alert(error.message);
            tableBody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    };
    
    const renderCompanySummary = (summary, companyName) => {
        if (!companyReportSummary) return;
        companyReportSummary.innerHTML = '';
        let html = `<div class="stat-card"><h4>${companyName}</h4><p style="font-size: 1.5em; font-weight: 700;">Cəmi ${summary.totalOrders} sifariş</p></div>`;
        Object.keys(summary.totalGelir).forEach(currency => {
            if (summary.totalGelir[currency] !== 0 || summary.totalDebt[currency] !== 0) {
                html += `<div class="currency-card"><h4>Yekun (${currency})</h4><p><span>Cəmi Gəlir:</span> <strong class="${summary.totalGelir[currency] < 0 ? 'text-danger' : 'text-success'}">${summary.totalGelir[currency].toFixed(2)}</strong></p><p><span>Cəmi Borc:</span> <strong class="text-danger">${summary.totalDebt[currency].toFixed(2)}</strong></p></div>`;
            }
        });
        companyReportSummary.innerHTML = html;
        companyReportSummary.style.display = 'grid';
    };

    const fetchReservationsAndRender = async () => {
        if (!reservationsTableBody) return;
        try {
            const response = await fetch(`/api/reservations`);
            if (!response.ok) throw new Error(`Server xətası: ${response.status}`);
            let reservations = await response.json();
            const hotelName = reservationFilterHotelNameInput.value.trim().toLowerCase();
            const filterDate = reservationFilterDateInput.value;
            const filterMonth = reservationFilterMonthInput.value;
            if (hotelName) reservations = reservations.filter(r => r.otelAdi.toLowerCase().includes(hotelName));
            if (filterDate) reservations = reservations.filter(r => r.girisTarixi === filterDate);
            else if (filterMonth) reservations = reservations.filter(r => r.girisTarixi.startsWith(filterMonth));
            reservations.sort((a, b) => (new Date(b.girisTarixi)) - (new Date(a.girisTarixi)));
            renderReservationsTable(reservations);
        } catch (error) {
            console.error('Rezervasiyalar yüklənərkən xəta:', error);
            reservationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Rezervasiyaları yükləmək mümkün olmadı.</td></tr>`;
        }
    };

    const renderReservationsTable = (reservations) => {
        if (!reservationsTableBody) return;
        reservationsTableBody.innerHTML = '';
        if (reservations.length === 0) {
            reservationsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Filterə uyğun rezervasiya tapılmadı.</td></tr>';
            return;
        }
        reservations.forEach(res => {
            const row = reservationsTableBody.insertRow();
            row.insertCell().textContent = res.satisNo || '-';
            row.insertCell().textContent = res.turist || '-';
            row.insertCell().textContent = res.otelAdi || '-';
            row.insertCell().textContent = res.girisTarixi || '-';
            row.insertCell().textContent = res.cixisTarixi || '-';
            row.insertCell().textContent = res.adultGuests ?? '-';
            row.insertCell().textContent = res.childGuests ?? '-';
            const actionsCell = row.insertCell();
            if (currentUserPermissions.canEditOrder) {
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn edit';
                editBtn.innerHTML = '✏️';
                editBtn.title = 'Sifarişə düzəliş et';
                editBtn.onclick = () => handleEditOrder(res.satisNo);
                actionsCell.appendChild(editBtn);
            }
        });
    };
    
    const generateInvoicePdf = (order) => {
        if (!order) { alert("PDF yaratmaq üçün sifariş məlumatları tapılmadı."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFont("helvetica", "normal");
        let yPosition = 20; const leftMargin = 15;
        const title = `${order.satisNo || '00000'}-Th Invoice to ${(order.tourists || [order.turist])[0] || 'XXX'}`;
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text(title, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
        yPosition += 20; doc.setFont("helvetica", "normal");
        
        const tableHead = [['Name', 'Number of pax', 'Description', 'Hotels and rooms', 'Entrances', 'Visas', 'Extras']];
        const pax = (parseInt(order.adultGuests) || 0) + (parseInt(order.childGuests) || 0);
        let hotelInfo = order.hotels?.map(h => `${h.otelAdi || ''}${h.otaqKategoriyasi ? ' ('+h.otaqKategoriyasi+')' : ''}`).join('\n') || '-';
        const description = order.transport?.turTevsiri || '-';
        const extras = order.transport?.elaveXidmetler || '-';
        const vizaInfo = (order.vizaSayi && parseInt(order.vizaSayi) > 0) ? `${order.vizaSayi}` : '-';
        const tableBody = [[(order.tourists || [order.turist])[0], pax, description, hotelInfo, '-', vizaInfo, extras]];
        for (let i = 0; i < 5; i++) tableBody.push(['', '', '', '', '', '', '']);
        doc.autoTable({
            head: tableHead, body: tableBody, startY: yPosition, theme: 'grid',
            styles: { font: "helvetica", fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'center' } }
        });
        yPosition = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        const totalText = `Total: ${order.satish.amount.toFixed(2)} ${order.satish.currency} + Bank Charges`;
        doc.text(totalText, leftMargin, yPosition);
        yPosition += 10; doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text('Beneficiary Bank // Bank Respublika OJSC ( Baku / Azerbaijan )', leftMargin, yPosition); yPosition += 5;
        doc.text('SWIFT: BRESAZ22', leftMargin, yPosition); yPosition += 5;
        doc.text('Beneficiary: AZER VVAYS TRAVEL MMC', leftMargin, yPosition); yPosition += 5;
        doc.text('IBAN:   AZ15BRES40160US0062166194003', leftMargin, yPosition); yPosition += 5;
        doc.text('GNI Account: 6-2166194-3', leftMargin, yPosition);
        doc.save(`Invoice_${order.rezNomresi || order.satisNo}.pdf`);
    };
    
    const handleSearchOrder = async () => {
        if (!searchInputRezNomresi || !searchResultDisplay) return;
        const rezNomresi = searchInputRezNomresi.value.trim();
        if (!rezNomresi) {
            searchResultDisplay.innerHTML = '<p class="error-message">Axtarış üçün rezervasiya nömrəsini daxil edin.</p>';
            return;
        }
        searchResultDisplay.innerHTML = '<p>Axtarılır...</p>';
        try {
            const response = await fetch(`/api/orders/search/rez/${encodeURIComponent(rezNomresi)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server xətası (${response.status})` }));
                throw new Error(errorData.message || 'Sifariş tapılmadı.');
            }
            const order = await response.json();
            if (order) {
                generateInvoicePdf(order);
                searchResultDisplay.innerHTML = `<p class="success-message">"${(order.tourists || [order.turist])[0]}" üçün invoys PDF faylı yaradıldı və endirilir...</p>`;
            }
        } catch (error) {
            searchResultDisplay.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    };
    
    const generateAndDisplayReport = async () => {
        if (!reportResultDisplay) return;
        let queryParams = '';
        const params = [];
        if (document.getElementById('reportFilterYear').value) params.push(`year=${document.getElementById('reportFilterYear').value}`);
        if (document.getElementById('reportFilterMonth').value) params.push(`month=${document.getElementById('reportFilterMonth').value}`);
        if (document.getElementById('reportFilterHotelName').value.trim()) params.push(`hotelName=${encodeURIComponent(document.getElementById('reportFilterHotelName').value.trim())}`);
        queryParams = params.join('&');
        reportResultDisplay.innerHTML = '<p>Hesabat hazırlanır...</p>';
        try {
            const response = await fetch(`/api/reports?${queryParams}`, { headers: { 'Accept': 'application/json' }});
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `Server xətası (${response.status})` }));
                 throw new Error(errorData.message);
            }
            const reportData = await response.json();
            renderReport(reportData);
        } catch (error) {
            console.error('Hesabat alarkən xəta:', error);
            reportResultDisplay.innerHTML = `<p class="error-message">Hesabatı almaq mümkün olmadı: ${error.message}</p>`;
        }
    };

    const renderReport = (data) => {
        if (!reportResultDisplay) return;
        reportResultDisplay.innerHTML = ''; 
        let html = '<h4>Ümumi Hesabat</h4><div class="report-summary">';
        ['AZN', 'USD', 'EUR'].forEach(currency => {
            if (data.totalAlish[currency] || data.totalSatish[currency] || data.totalGelir[currency]) {
                html += `<div class="currency-total report-currency-block"><p><strong>Valyuta: ${currency}</strong></p><p><span>Cəmi Alış:</span> <strong>${data.totalAlish[currency].toFixed(2)}</strong></p><p><span>Cəmi Satış:</span> <strong>${data.totalSatish[currency].toFixed(2)}</strong></p><p><span>Cəmi Gəlir:</span> <strong class="${data.totalGelir[currency] < 0 ? 'text-danger' : 'text-success'}">${data.totalGelir[currency].toFixed(2)}</strong></p></div>`;
            }
        });
        html += '</div><h4>Otellər üzrə Detallı Hesabat</h4>';
        if (Object.keys(data.byHotel).length === 0) {
            html += '<p>Seçilmiş filterlərə uyğun otel məlumatı tapılmadı.</p>';
        } else {
            html += '<div class="table-container"><table class="report-table"><thead><tr><th>Otel Adı</th><th>Sifariş Sayı</th><th>Alış (AZN)</th><th>Satış (AZN)</th><th>Gəlir (AZN)</th><th>Alış (USD)</th><th>Satış (USD)</th><th>Gəlir (USD)</th><th>Alış (EUR)</th><th>Satış (EUR)</th><th>Gəlir (EUR)</th></tr></thead><tbody>';
            for (const hotelName in data.byHotel) {
                const d = data.byHotel[hotelName];
                html += `<tr><td>${hotelName}</td><td>${d.ordersCount}</td><td>${d.alish.AZN.toFixed(2)}</td><td>${d.satish.AZN.toFixed(2)}</td><td class="${d.gelir.AZN < 0 ? 'text-danger' : ''}">${d.gelir.AZN.toFixed(2)}</td><td>${d.alish.USD.toFixed(2)}</td><td>${d.satish.USD.toFixed(2)}</td><td class="${d.gelir.USD < 0 ? 'text-danger' : ''}">${d.gelir.USD.toFixed(2)}</td><td>${d.alish.EUR.toFixed(2)}</td><td>${d.satish.EUR.toFixed(2)}</td><td class="${d.gelir.EUR < 0 ? 'text-danger' : ''}">${d.gelir.EUR.toFixed(2)}</td></tr>`;
            }
            html += '</tbody></table></div>';
        }
        reportResultDisplay.innerHTML = html;
    };
    
    const fetchAndRenderNotifications = async () => {
        if (!notificationsTableBody) return;
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) throw new Error('Bildirişləri yükləmək mümkün olmadı.');
            const notifications = await response.json();
            if (notificationCountBadge) {
                notificationCountBadge.textContent = notifications.length;
                notificationCountBadge.style.display = notifications.length > 0 ? 'inline' : 'none';
            }
            renderNotificationsTable(notifications);
        } catch (error) {
            notificationsTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${error.message}</td></tr>`;
        }
    };
    
    const renderNotificationsTable = (notifications) => {
        if (!notificationsTableBody) return;
        notificationsTableBody.innerHTML = '';
        if (notifications.length === 0) {
            notificationsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Təcili bildiriş yoxdur.</td></tr>';
            return;
        }
        notifications.forEach(notif => {
            const row = notificationsTableBody.insertRow();
            row.insertCell().textContent = notif.satisNo;
            row.insertCell().textContent = notif.turist;
            row.insertCell().textContent = notif.girisTarixi;
            row.insertCell().textContent = notif.problem;
            const actionCell = row.insertCell();
            const goToOrderBtn = document.createElement('button');
            goToOrderBtn.textContent = 'Sifarişə Keç';
            goToOrderBtn.className = 'action-btn edit';
            goToOrderBtn.onclick = () => {
                nav.showView('satishlar');
                handleEditOrder(notif.satisNo);
            };
            actionCell.appendChild(goToOrderBtn);
        });
    };

    const renderDebtsTable = (debts) => {
        if (!borclarTableBody) return;
        borclarTableBody.innerHTML = '';
        if (debts.length === 0) {
            borclarTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${i18n.t('noDebtsFound')}</td></tr>`;
            return;
        }
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        debts.sort((a, b) => (new Date(a.paymentDueDate) || 0) - (new Date(b.paymentDueDate) || 0));
        debts.forEach(debt => {
            const row = borclarTableBody.insertRow();
            const dueDate = debt.paymentDueDate ? new Date(debt.paymentDueDate) : null;
            if (dueDate && dueDate < now) row.style.backgroundColor = '#f8d7da';
            row.insertCell().textContent = debt.xariciSirket;
            row.insertCell().textContent = debt.satisNo;
            row.insertCell().textContent = (debt.tourists || [debt.turist])[0];
            row.insertCell().textContent = `${(debt.satish?.amount || 0).toFixed(2)} ${debt.satish?.currency}`;
            row.insertCell().textContent = debt.paymentDueDate || 'Təyin edilməyib';
            const actionCell = row.insertCell();
            const goToOrderBtn = document.createElement('button');
            goToOrderBtn.textContent = i18n.t('debtsHeaderGoToOrder');
            goToOrderBtn.className = 'action-btn edit';
            goToOrderBtn.onclick = () => { nav.showView('satishlar'); handleEditOrder(debt.satisNo); };
            actionCell.appendChild(goToOrderBtn);
        });
    };

    const fetchAndRenderDebts = async () => {
        if (!borclarView) return;
        const searchTerm = borclarSearchInput.value.trim();
        let url = '/api/debts';
        if (searchTerm) url += `?company=${encodeURIComponent(searchTerm)}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Borcları yükləmək mümkün olmadı.');
            const debts = await response.json();
            renderDebtsTable(debts);
        } catch (error) {
            console.error("Borclar yüklənərkən xəta:", error);
            if (borclarTableBody) borclarTableBody.innerHTML = `<tr><td colspan="6" class="error-message">${error.message}</td></tr>`;
        }
    };

    // --- WebSocket Məntiqi ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);
    socket.onopen = () => console.log('WebSocket bağlantısı quruldu.');
    socket.onclose = () => console.log('WebSocket bağlantısı kəsildi.');
    socket.onerror = (error) => console.error('WebSocket xətası:', error);
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'history') {
            chatMessages.innerHTML = '';
            message.data.forEach(msg => displayMessage(msg));
        } else if (message.type === 'message') {
            displayMessage(message.data);
        }
    };
    const displayMessage = (msg) => {
        const messageElement = document.createElement('div');
        const isOwn = msg.sender === currentUserDisplayName;
        messageElement.className = `chat-message ${isOwn ? 'own' : 'other'}`;
        const messageTime = new Date(msg.timestamp).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            ${!isOwn ? `<div class="sender">${msg.sender}</div>` : ''}
            <div class="message-text">${msg.text}</div>
            <div class="timestamp">${messageTime}</div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text) {
            socket.send(JSON.stringify({ text }));
            chatInput.value = '';
        }
    };
    
    // --- Hadisə Dinləyiciləri ---
    if (showAddOrderFormBtn) {
        showAddOrderFormBtn.addEventListener('click', () => { 
            try {
                resetModalToCreateMode(); 
                modal.style.display = 'block';
            } catch (error) {
                console.error("Yeni sifariş düyməsinə kliklədikdə xəta baş verdi:", error);
                alert("Forma açıla bilmədi. Zəhmət olmasa, konsola baxın.");
            }
        });
    }
    if (closeButton) closeButton.addEventListener('click', () => modal.style.display = 'none');
    if (closeNoteModalBtn) closeNoteModalBtn.addEventListener('click', () => noteModal.style.display = 'none');
    window.addEventListener('click', (e) => { 
        if (e.target === modal) modal.style.display = 'none'; 
        if (e.target === noteModal) noteModal.style.display = 'none';
    });
    document.body.addEventListener('input', (e) => { if (e.target.matches('#addOrderForm .cost-input')) calculateTotalCost(); });
    if (addHotelBtn) addHotelBtn.addEventListener('click', () => addHotelEntry());
    if (hotelEntriesContainer) hotelEntriesContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-hotel-btn')) { e.target.closest('.hotel-entry').remove(); calculateTotalCost(); } });
    
    if (addOrderForm) {
        addOrderForm.addEventListener('submit', async (e) => {
             e.preventDefault();
             const touristInputs = touristsContainer.querySelectorAll('.tourist-name-input');
             const tourists = [];
             let allNamesFilled = true;
             touristInputs.forEach(input => {
                 const name = input.value.trim();
                 if (name === '') allNamesFilled = false;
                 tourists.push(name);
             });
             if (!allNamesFilled) {
                 alert('Zəhmət olmasa, bütün turistlərin adlarını daxil edin.');
                 return;
             }
             const getFormValue = (id) => {
                const element = document.getElementById(id);
                return element ? element.value : '';
             };
             const orderData = {
                 tourists: tourists,
                 xariciSirket: getFormValue('xariciSirket'),
                 adultGuests: getFormValue('adultGuests'),
                 childGuests: getFormValue('childGuests'),
                 vizaSayi: getFormValue('vizaSayi'),
                 rezNomresi: getFormValue('rezNomresi'),
                 status: getFormValue('status'),
                 qeyd: getFormValue('qeyd'),
                 transport: {
                     surucuMelumatlari: getFormValue('transport_surucuMelumatlari'),
                     xerci: parseFloat(getFormValue('transport_xerci')) || 0,
                     odenisKartMelumatlari: getFormValue('transport_odenisKartMelumatlari'),
                     turTevsiri: getFormValue('transport_turTevsiri'),
                     elaveXidmetler: getFormValue('transport_elaveXidmetler'),
                 },
                 hotels: Array.from(hotelEntriesContainer.querySelectorAll('.hotel-entry')).map(entry => ({
                     otelAdi: entry.querySelector('.hotel_otelAdi').value.trim(),
                     otaqKategoriyasi: entry.querySelector('.hotel_otaqKategoriyasi').value.trim(),
                     girisTarixi: entry.querySelector('.hotel_girisTarixi').value,
                     cixisTarixi: entry.querySelector('.hotel_cixisTarixi').value,
                     qiymet: parseFloat(entry.querySelector('.hotel-price-input').value) || 0,
                     confirmationPath: entry.querySelector('.hotel-confirmation-path').value.trim()
                 })).filter(h => h.otelAdi),
                 paymentStatus: getFormValue('paymentStatus'),
                 paymentDueDate: getFormValue('paymentDueDate')
             };
             if (!editingOrderId || currentUserPermissions.canEditFinancials) {
                 orderData.alish = { amount: parseFloat(getFormValue('alishAmount')) || 0, currency: getFormValue('alishCurrency') };
                 orderData.satish = { amount: parseFloat(getFormValue('satishAmount')) || 0, currency: getFormValue('satishCurrency') };
                 orderData.detailedCosts = {
                     paketXerci: parseFloat(document.getElementById('detailedCost_paket').value) || 0,
                     beledciXerci: parseFloat(document.getElementById('detailedCost_beledci').value) || 0,
                     muzeyXerci: parseFloat(document.getElementById('detailedCost_muzey').value) || 0,
                     vizaXerci: parseFloat(document.getElementById('detailedCost_viza').value) || 0,
                     digerXercler: parseFloat(document.getElementById('detailedCost_diger').value) || 0,
                 };
             }
             const url = editingOrderId ? `/api/orders/${editingOrderId}` : '/api/orders';
             const method = editingOrderId ? 'PUT' : 'POST';
             try {
                 const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
                 if (!response.ok) {
                     const err = await response.json();
                     throw new Error(err.message || 'Server xətası');
                 }
                 modal.style.display = 'none';
                 await fetchOrdersAndRender();
             } catch (error) {
                 alert(i18n.t('errorOrderSave', { error: error.message }));
             }
        });
    }

    if (noteForm) noteForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        const satisNo = noteSatisNoInput.value;
        const qeyd = noteTextInput.value;
        try {
            const response = await fetch(`/api/orders/${satisNo}/note`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qeyd })
            });
            if (!response.ok) throw new Error('Qeyd saxlanılarkən xəta baş verdi.');
            noteModal.style.display = 'none';
            await fetchOrdersAndRender();
        } catch (error) {
            alert(error.message);
        }
    });
    
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', fetchOrdersAndRender);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => {
        document.getElementById('filterRezNo').value = '';
        document.getElementById('filterYear').value = '';
        document.getElementById('filterMonth').value = '';
        document.getElementById('filterDate').value = '';
        fetchOrdersAndRender();
    });

    if (getCompanyReportBtn) getCompanyReportBtn.addEventListener('click', handleGetCompanyReport);
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    if(applyReservationFiltersBtn) applyReservationFiltersBtn.addEventListener('click', fetchReservationsAndRender);
    if(resetReservationFiltersBtn) resetReservationFiltersBtn.addEventListener('click', () => {
        reservationFilterHotelNameInput.value = '';
        reservationFilterMonthInput.value = '';
        reservationFilterDateInput.value = '';
        fetchReservationsAndRender();
    });
    if (searchButton) searchButton.addEventListener('click', handleSearchOrder);
    if (generateReportBtn) generateReportBtn.addEventListener('click', generateAndDisplayReport);
    if (borclarSearchBtn) borclarSearchBtn.addEventListener('click', fetchAndRenderDebts);
    if (adultGuestsInput) adultGuestsInput.addEventListener('input', () => updateTouristNameInputs());
    if (childGuestsInput) childGuestsInput.addEventListener('input', () => updateTouristNameInputs());
    if (hotelEntriesContainer) {
        hotelEntriesContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('hotel-confirmation-upload')) {
                handleFileUpload(e.target);
            }
        });
        hotelEntriesContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('hotel-confirmation-path')) {
                const linkElement = e.target.nextElementSibling;
                if (e.target.value.trim()) {
                    linkElement.href = e.target.value.trim();
                    linkElement.classList.add('visible');
                } else {
                    linkElement.classList.remove('visible');
                }
            }
        });
    }

    const handleFileUpload = async (fileInput) => {
        const file = fileInput.files[0];
        if (!file) return;

        const wrapper = fileInput.closest('.file-upload-wrapper');
        const statusSpan = wrapper.querySelector('.file-status');
        const link = wrapper.querySelector('.view-confirmation');
        const pathInput = wrapper.querySelector('.hotel-confirmation-path');

        statusSpan.textContent = 'Yüklənir...';
        statusSpan.style.color = 'var(--text-secondary)';
        link.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Yükləmə zamanı xəta baş verdi.');

            const result = await response.json();
            statusSpan.textContent = 'Yükləndi!';
            statusSpan.style.color = 'var(--success-color)';
            pathInput.value = result.filePath;
            link.href = result.filePath;
            link.style.display = 'inline-flex';
        } catch (error) {
            statusSpan.textContent = `Xəta: ${error.message}`;
            statusSpan.style.color = 'red';
        }
    };

    // --- NAVİQASİYA MƏNTİQİ ---
    const setupNavigation = () => {
        const views = { satishlar: satishlarView, rezervasiyalar: rezervasiyalarView, bildirishler: bildirishlerView, axtarish: searchView, hesabat: hesabatView, chat: chatView, borclar: borclarView };
        const buttons = { satishlar: navSatishlarBtn, rezervasiyalar: navRezervasiyalarBtn, bildirishler: navBildirishlerBtn, axtarish: navAxtarishBtn, hesabat: navHesabatBtn, chat: navChatBtn, borclar: navBorclarBtn };
        
        const showView = (viewId) => {
            Object.values(views).forEach(v => v ? v.style.display = 'none' : null);
            Object.values(buttons).forEach(b => b ? b.classList.remove('active') : null);
            if (views[viewId]) views[viewId].style.display = 'block';
            if (buttons[viewId]) buttons[viewId].classList.add('active');
            
            if (viewId === 'rezervasiyalar') fetchReservationsAndRender();
            if (viewId === 'bildirishler') fetchAndRenderNotifications();
            if (viewId === 'borclar') fetchAndRenderDebts();
            if (viewId === 'hesabat') {
                populateCompanyFilter();
                if(companyReportResult) companyReportResult.style.display = 'none';
                if(companyReportSummary) companyReportSummary.style.display = 'none';
            }
        };

        Object.keys(buttons).forEach(key => {
            if (buttons[key]) buttons[key].addEventListener('click', () => showView(key));
        });

        showView('satishlar');
        return { showView };
    };
    
    const fetchAndRenderPendingTasksCount = async () => {
        if (!tasksCountBadge) return;
        try {
            const response = await fetch('/api/tasks/pending-count');
            if (!response.ok) return;
            const { count } = await response.json();
            if (count > 0) {
                tasksCountBadge.textContent = count;
                tasksCountBadge.style.display = 'inline';
            } else {
                tasksCountBadge.style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching pending task count:", error);
        }
    };

    // --- İlkin Yükləmə ---
    const nav = setupNavigation();
    fetchOrdersAndRender();
    fetchAndRenderNotifications();
    fetchAndRenderPendingTasksCount();
    startMascotLifeCycle();
});
