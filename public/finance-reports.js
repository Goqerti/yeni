// public/finance-reports.js
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Qlobal Dəyişənlər ---
    let currentOrders = [];
    let currentUserPermissions = {};
    let editingOrderId = null;

    // --- DOM Elementləri ---
    const companyFilterSelect = document.getElementById('companyFilterSelect');
    const getCompanyReportBtn = document.getElementById('getCompanyReportBtn');
    const companyOrdersTableBody = document.getElementById('companyOrdersTableBody');
    const summaryContainer = document.getElementById('companyReportSummary');
    const companyReportResult = document.getElementById('companyReportResult');

    const modal = document.getElementById('addOrderModal');
    const addOrderForm = document.getElementById('addOrderForm');
    const addHotelBtn = document.getElementById('addHotelBtn');
    const hotelEntriesContainer = document.getElementById('hotelEntriesContainer');
    const costsContainer = document.getElementById('costsContainer');
    const adultGuestsInput = document.getElementById('adultGuests');
    const childGuestsInput = document.getElementById('childGuests');
    const touristsContainer = document.getElementById('touristsContainer');
    const noteModal = document.getElementById('noteModal');
    const noteForm = document.getElementById('noteForm');
    
    // --- İcazələrin Yüklənməsi ---
    try {
        const response = await fetch('/api/user/permissions');
        if (!response.ok) {
            if(response.status === 401 || response.status === 403) window.location.href = '/login.html';
            throw new Error('İcazələr yüklənə bilmədi');
        }
        currentUserPermissions = await response.json();
    } catch (error) {
        alert(error.message);
    }
    
    // --- Köməkçi Funksiyalar ---
    const calculateGelir = (order) => {
        const alishAmount = order.alish?.amount || 0;
        const satishAmount = order.satish?.amount || 0;
        if (order.alish?.currency === order.satish?.currency) {
            return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)), currency: order.satish.currency };
        }
        return { amount: 0, currency: 'N/A' };
    };

    const addHotelEntry = (hotel = {}, paymentDetail = {}) => {
        if (!hotelEntriesContainer) return;
        const entryId = `hotel-entry-${Date.now()}${Math.random()}`;
        const hotelEntryDiv = document.createElement('div');
        hotelEntryDiv.className = 'hotel-entry';
        hotelEntryDiv.id = entryId;
        const isPaid = paymentDetail.paid;
        
        hotelEntryDiv.innerHTML = `
            <div class="form-group-inline">
                <input type="text" class="hotel_otelAdi" placeholder="Otel Adı" value="${hotel.otelAdi || ''}">
                <input type="number" step="0.01" class="hotel-price-input cost-input" placeholder="Qiymət" value="${hotel.qiymet || 0}">
                <button type="button" class="payment-toggle-btn ${isPaid ? 'paid' : ''}" data-type="hotel" data-name="${hotel.otelAdi}">${isPaid ? 'Ödənilib' : 'Ödə'}</button>
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
                <label for="file-upload-${entryId}" class="file-upload-label">Çek/Sənəd</label>
                <input type="file" id="file-upload-${entryId}" class="receipt-upload" data-type="hotel" data-name="${hotel.otelAdi}" accept="image/*,application/pdf">
                <a href="${hotel.confirmationPath || '#'}" class="view-receipt-link" target="_blank" style="display: ${hotel.confirmationPath ? 'inline-flex' : 'none'};">🔗</a>
                <input type="hidden" class="receipt-path-input" value="${hotel.confirmationPath || ''}">
            </div>
        `;
        hotelEntriesContainer.appendChild(hotelEntryDiv);
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

    const resetModalToEditMode = () => {
        addOrderForm.reset();
        hotelEntriesContainer.innerHTML = '';
        addHotelEntry();
        calculateTotalCost();
        document.querySelectorAll('#addOrderForm input, #addOrderForm select, #addOrderForm textarea').forEach(el => el.disabled = false);
        document.getElementById('alishAmount').readOnly = true;
        updateTouristNameInputs();
    };

    const setInputValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value !== null && value !== undefined ? value : '';
    };

    const getFormValue = (elId) => {
        const element = document.getElementById(elId);
        return element ? element.value : '';
    };

    const createCostItemHTML = (key, name, costData = {}, paymentDetail = {}) => {
        const entryId = `cost-entry-${key}`;
        const isPaid = paymentDetail.paid;
        return `
            <div class="form-group-inline payment-item">
                <label for="cost-${key}">${name}:</label>
                <input type="number" id="detailedCost_${key}" class="cost-input" value="${costData || 0}" step="0.01">
                <button type="button" class="payment-toggle-btn ${isPaid ? 'paid' : ''}" data-type="${key}">${isPaid ? 'Ödənilib' : 'Ödə'}</button>
                <div class="file-upload-wrapper">
                    <label for="file-${entryId}" class="file-upload-label">Çek</label>
                    <input type="file" id="file-${entryId}" class="receipt-upload" data-type="${key}" accept="image/*,application/pdf">
                    <a href="${paymentDetail.receiptPath || '#'}" class="view-receipt-link" target="_blank" style="display: ${paymentDetail.receiptPath ? 'inline-flex' : 'none'};">🔗</a>
                    <input type="hidden" class="receipt-path-input" value="${paymentDetail.receiptPath || ''}">
                </div>
            </div>
        `;
    };

    // --- Əsas Funksiyalar ---
    const populateCompanyFilter = async () => {
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
    const renderCompanySummary = (summary, companyName) => {
        if (!summaryContainer) return;
        summaryContainer.innerHTML = ''; 

        let html = `
            <div class="stat-card">
                <h4>${companyName}</h4>
                <p style="font-size: 1.5em; font-weight: 700;">Cəmi ${summary.totalOrders} sifariş</p>
            </div>
        `;
        Object.keys(summary.totalGelir).forEach(currency => {
            if (summary.totalGelir[currency] !== 0 || summary.totalDebt[currency] !== 0) {
                html += `
                    <div class="currency-card">
                        <h4>Yekun (${currency})</h4>
                        <p><span>Cəmi Gəlir:</span> <strong class="${summary.totalGelir[currency] < 0 ? 'text-danger' : 'text-success'}">${summary.totalGelir[currency].toFixed(2)}</strong></p>
                        <p><span>Cəmi Borc:</span> <strong class="text-danger">${summary.totalDebt[currency].toFixed(2)}</strong></p>
                    </div>
                `;
            }
        });
        summaryContainer.innerHTML = html;
        summaryContainer.style.display = 'grid';
    };

    const renderOrdersTable = (orders) => {
        companyOrdersTableBody.innerHTML = '';
        if (orders.length === 0) {
            companyOrdersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Bu şirkət üçün sifariş tapılmadı.</td></tr>`;
            return;
        }
        orders.sort((a,b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp));
        
        orders.forEach(order => {
            const row = companyOrdersTableBody.insertRow();
            row.className = `order-row status-${order.overallPaymentStatus}`;

            row.insertCell().textContent = order.satisNo;
            const primaryTourist = (order.tourists && order.tourists[0]) || order.turist || '-';
            row.insertCell().textContent = primaryTourist + (order.tourists && order.tourists.length > 1 ? ` (+${order.tourists.length - 1})` : '');
            row.insertCell().textContent = `${(order.alish?.amount || 0).toFixed(2)} ${order.alish?.currency}`;
            row.insertCell().textContent = `${(order.satish?.amount || 0).toFixed(2)} ${order.satish?.currency}`;
            row.insertCell().textContent = `${order.gelir.amount.toFixed(2)} ${order.gelir.currency}`;
            
            const actionsCell = row.insertCell();
            if (currentUserPermissions.finance_canEditCompanyOrders) {
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn edit';
                editBtn.innerHTML = '✏️';
                editBtn.title = 'Sifarişə düzəliş et';
                editBtn.onclick = () => handleEditOrder(order);
                actionsCell.appendChild(editBtn);
            }
        });
    };

    const handleGetCompanyReport = async () => {
        const selectedCompany = companyFilterSelect.value;
        if (!selectedCompany) return alert('Zəhmət olmasa, bir şirkət seçin.');
        
        companyReportResult.style.display = 'none';
        summaryContainer.style.display = 'none';
        companyOrdersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Yüklənir...</td></tr>`;
        companyReportResult.style.display = 'block';

        try {
            const response = await fetch(`/api/reports/by-company?company=${encodeURIComponent(selectedCompany)}`);
            if (!response.ok) throw new Error('Sifarişlər yüklənərkən xəta baş verdi.');
            
            const { orders, summary } = await response.json();
            currentOrders = orders;
            renderCompanySummary(summary, selectedCompany);
            renderOrdersTable(orders);
        } catch (error) {
            alert(error.message);
        }
    };
    
    const handleEditOrder = (order) => {
        resetModalToEditMode();
        editingOrderId = order.satisNo;
        document.getElementById('editingOrderId').value = order.satisNo;

        setInputValue('xariciSirket', order.xariciSirket);
        setInputValue('adultGuests', order.adultGuests);
        setInputValue('childGuests', order.childGuests);
        setInputValue('rezNomresi', order.rezNomresi);
        setInputValue('transport_surucuMelumatlari', order.transport?.surucuMelumatlari);
        setInputValue('transport_xerci', order.transport?.xerci);
        setInputValue('status', order.status);
        setInputValue('qeyd', order.qeyd);
        setInputValue('satishAmount', order.satish?.amount);
        setInputValue('satishCurrency', order.satish?.currency);
        setInputValue('alishCurrency', order.alish?.currency);
        setInputValue('paymentStatus', order.paymentStatus);
        setInputValue('paymentDueDate', order.paymentDueDate);
        
        updateTouristNameInputs(order.tourists || [order.turist]);
        
        const costs = order.detailedCosts || {};
        const paymentDetails = order.paymentDetails || {};
        const costTypes = { paket: 'Paket', beledci: 'Bələdçi', muzey: 'Muzey', viza: 'Viza', diger: 'Digər' };
        costsContainer.innerHTML = '';
        for (const [key, name] of Object.entries(costTypes)) {
            costsContainer.innerHTML += createCostItemHTML(key, name, costs[key + 'Xerci'], paymentDetails.detailedCosts?.[key]);
        }
        
        hotelEntriesContainer.innerHTML = '';
        if (order.hotels?.length > 0) {
            order.hotels.forEach(hotel => {
                const paymentDetail = order.paymentDetails?.hotels.find(pdh => pdh.name === hotel.otelAdi) || { paid: false };
                addHotelEntry(hotel, paymentDetail);
            });
        } else {
            addHotelEntry();
        }
        
        calculateTotalCost();
        
        const canChangePayments = currentUserPermissions.finance_canChangePayments;
        document.querySelectorAll('.payment-toggle-btn').forEach(btn => {
            btn.disabled = !canChangePayments;
        });
        
        modal.querySelector('h3').textContent = `Sifarişə Düzəliş Et (№${order.satisNo})`;
        modal.style.display = 'flex';
    };

    // --- Hadisə Dinləyiciləri ---
    getCompanyReportBtn.addEventListener('click', handleGetCompanyReport);

    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editingOrderId').value;
        if (!id) return;

        const touristInputs = touristsContainer.querySelectorAll('.tourist-name-input');
        const tourists = Array.from(touristInputs).map(input => input.value.trim()).filter(Boolean);
        if (tourists.length !== touristInputs.length) {
            return alert('Zəhmət olmasa, bütün turistlərin adlarını daxil edin.');
        }
        
        const paymentDetails = { hotels: [], transport: {}, detailedCosts: {} };
        document.querySelectorAll('.payment-toggle-btn').forEach(btn => {
            const type = btn.dataset.type;
            const isPaid = btn.dataset.paid === 'true';
            if (type === 'hotel') {
                const hotelEntry = btn.closest('.hotel-entry');
                const hotelName = hotelEntry.querySelector('.hotel_otelAdi').value;
                const receiptPath = hotelEntry.querySelector('.receipt-path-input').value;
                if (hotelName) paymentDetails.hotels.push({ name: hotelName, paid: isPaid, receiptPath: receiptPath });
            } else if (type === 'transport') {
                paymentDetails.transport = { paid: isPaid, receiptPath: document.querySelector('.payment-item [data-type="transport"]').closest('.payment-item').querySelector('.receipt-path-input').value };
            } else {
                paymentDetails.detailedCosts[type] = { paid: isPaid, receiptPath: document.querySelector(`.payment-item [data-type="${type}"]`).closest('.payment-item').querySelector('.receipt-path-input').value };
            }
        });

        const orderData = {
            tourists,
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
            hotels: Array.from(hotelEntriesContainer.querySelectorAll('.hotel-entry')).map(entry => {
                 const pathInput = entry.querySelector('.hotel-confirmation-path');
                 return {
                     otelAdi: entry.querySelector('.hotel_otelAdi').value.trim(),
                     otaqKategoriyasi: entry.querySelector('.hotel_otaqKategoriyasi').value.trim(),
                     girisTarixi: entry.querySelector('.hotel_girisTarixi').value,
                     cixisTarixi: entry.querySelector('.hotel_cixisTarixi').value,
                     qiymet: parseFloat(entry.querySelector('.hotel-price-input').value) || 0,
                     confirmationPath: pathInput ? pathInput.value.trim() : ''
                 };
             }).filter(h => h.otelAdi),
            paymentStatus: getFormValue('paymentStatus'),
            paymentDueDate: getFormValue('paymentDueDate'),
            paymentDetails: paymentDetails
        };

        if (currentUserPermissions.canEditFinancials) {
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
        
        try {
            const response = await fetch(`/api/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error((await response.json()).message);
            modal.style.display = 'none';
            await handleGetCompanyReport();
        } catch (error) {
            alert(`Xəta: ${error.message}`);
        }
    });
    
    if (noteForm) { /* ... */ }
    
    modal.querySelector('.close-button').addEventListener('click', () => modal.style.display = 'none');
    if (noteModal) noteModal.querySelector('.close-button').addEventListener('click', () => noteModal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === noteModal) noteModal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('payment-toggle-btn')) {
            const isPaid = e.target.dataset.paid === 'true';
            e.target.dataset.paid = !isPaid;
            e.target.textContent = !isPaid ? 'Ödənilib' : 'Ödə';
            e.target.classList.toggle('paid', !isPaid);
        }
    });

    if (addHotelBtn) addHotelBtn.addEventListener('click', () => addHotelEntry());
    if (hotelEntriesContainer) hotelEntriesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-hotel-btn')) {
            e.target.closest('.hotel-entry').remove();
            calculateTotalCost();
        }
    });
    if (adultGuestsInput) adultGuestsInput.addEventListener('input', () => updateTouristNameInputs());
    if (childGuestsInput) childGuestsInput.addEventListener('input', () => updateTouristNameInputs());
    document.body.addEventListener('input', (e) => {
        if (e.target.matches('.cost-input, .hotel-price-input')) {
            calculateTotalCost();
        }
    });

    populateCompanyFilter();
});
