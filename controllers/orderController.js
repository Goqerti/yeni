// controllers/orderController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');
const { logAction } = require('../services/auditLogService');

// --- Köməkçi Funksiyalar ---

const calculateGelir = (order) => {
    const alishAmount = order.alish?.amount || 0;
    const satishAmount = order.satish?.amount || 0;
    if (order.alish?.currency === order.satish?.currency) {
        return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)), currency: order.satish.currency };
    }
    return { amount: 0, currency: 'N/A', note: 'Fərqli valyutalar' };
};

const formatChanges = (original, updated) => {
    const changes = [];
    const fieldsToTrack = {
        status: "Status",
        xariciSirket: "Xarici şirkət",
        rezNomresi: "Rez. nömrəsi",
        paymentStatus: "Ödəniş statusu"
    };

    const originalTouristsStr = Array.isArray(original.tourists) ? original.tourists.join(', ') : original.turist;
    const updatedTouristsStr = Array.isArray(updated.tourists) ? updated.tourists.join(', ') : updated.turist;

    if (originalTouristsStr !== updatedTouristsStr) {
        changes.push(`- <i>Turistlər</i>: '${originalTouristsStr || ""}' -> '${updatedTouristsStr || ""}'`);
    }

    for (const key in fieldsToTrack) {
        if (original[key] !== updated[key]) {
            changes.push(`- <i>${fieldsToTrack[key]}</i>: '${original[key] || ""}' -> '${updated[key] || ""}'`);
        }
    }

    const originalAlish = `${(original.alish?.amount || 0).toFixed(2)} ${original.alish?.currency}`;
    const updatedAlish = `${(updated.alish?.amount || 0).toFixed(2)} ${updated.alish?.currency}`;
    if (originalAlish !== updatedAlish) {
        changes.push(`- <i>Alış qiyməti</i>: '${originalAlish}' -> '${updatedAlish}'`);
    }

    const originalSatish = `${(original.satish?.amount || 0).toFixed(2)} ${original.satish?.currency}`;
    const updatedSatish = `${(updated.satish?.amount || 0).toFixed(2)} ${updated.satish?.currency}`;
    if (originalSatish !== updatedSatish) {
        changes.push(`- <i>Satış qiyməti</i>: '${originalSatish}' -> '${updatedSatish}'`);
    }

    return changes.length > 0 ? `\n<b>Dəyişikliklər:</b>\n${changes.join('\n')}` : '';
};

const calculateOverallPaymentStatus = (paymentDetails) => {
    const allItems = [];
    if (paymentDetails) {
        (paymentDetails.hotels || []).forEach(item => { if(item.name) allItems.push(item.paid) });
        if (paymentDetails.transport) allItems.push(paymentDetails.transport.paid);
        if (paymentDetails.detailedCosts) {
            Object.values(paymentDetails.detailedCosts).forEach(item => allItems.push(item.paid));
        }
    }
    
    if (allItems.length === 0 || allItems.every(status => status === false)) {
        return 'unpaid';
    }
    if (allItems.every(status => status === true)) {
        return 'paid';
    }
    return 'partial';
};

const ensurePaymentDetails = (order) => {
    if (!order.paymentDetails) {
        order.paymentDetails = {};
    }
    const details = order.paymentDetails;
    
    details.hotels = (order.hotels || []).map(h => {
        const existing = details.hotels?.find(hd => hd.name === h.otelAdi);
        return { name: h.otelAdi, paid: existing?.paid || false, receiptPath: h.confirmationPath || existing?.receiptPath || null };
    });

    if (!details.transport) details.transport = { paid: false, receiptPath: null };
    
    const costKeys = ['paket', 'beledci', 'muzey', 'viza', 'diger'];
    if (!details.detailedCosts) details.detailedCosts = {};
    costKeys.forEach(key => {
        if (!details.detailedCosts[key]) {
            details.detailedCosts[key] = { paid: false, receiptPath: null };
        }
    });

    return order;
};

const logConfirmationLinks = (req, order) => {
    if (order.hotels && Array.isArray(order.hotels)) {
        order.hotels.forEach(hotel => {
            if (hotel.confirmationPath && (!req.originalOrder || req.originalOrder.hotels.find(h => h.otelAdi === hotel.otelAdi)?.confirmationPath !== hotel.confirmationPath)) {
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    satisNo: order.satisNo,
                    hotel: hotel.otelAdi,
                    path: hotel.confirmationPath,
                    uploadedBy: req.session.user.displayName
                };
                fileStore.appendToPhotoTxt(logEntry);
            }
        });
    }
};

// --- Controller Funksiyaları ---

exports.getAllOrders = (req, res) => {
    try {
        const orders = fileStore.getOrders().map(ensurePaymentDetails);
        res.json(orders.map(o => ({ ...o, gelir: calculateGelir(o) })));
    } catch (error) {
        console.error("Sifarişlər gətirilərkən xəta:", error);
        res.status(500).json({ message: "Sifarişlər gətirilərkən daxili server xətası baş verdi." });
    }
};

exports.createOrder = (req, res) => {
    try {
        const newOrderData = req.body;
        if (!newOrderData.tourists || !Array.isArray(newOrderData.tourists) || newOrderData.tourists.length === 0 || newOrderData.tourists.some(t => !t || t.trim() === '')) {
            return res.status(400).json({ message: 'Bütün turist adları daxil edilməlidir.' });
        }
        const orders = fileStore.getOrders();
        let nextSatisNo = 1695;
        if (orders.length > 0) {
            const maxSatisNo = Math.max(...orders.map(o => parseInt(o.satisNo)).filter(num => !isNaN(num)), 0);
            nextSatisNo = maxSatisNo >= 1695 ? maxSatisNo + 1 : 1695;
        }

        let orderToSave = {
            satisNo: String(nextSatisNo),
            creationTimestamp: new Date().toISOString(),
            createdBy: req.session.user.username,
            ...newOrderData,
            paymentStatus: newOrderData.paymentStatus || 'Ödənilməyib',
            paymentDueDate: newOrderData.paymentDueDate || null,
        };
        
        orderToSave = ensurePaymentDetails(orderToSave);
        delete orderToSave.turist;

        orders.push(orderToSave);
        fileStore.saveAllOrders(orders);

        logConfirmationLinks(req, orderToSave);

        const gelir = calculateGelir(orderToSave);
        if (gelir.amount < 0) {
            const warningMessage = `🔴 **DİQQƏT: MƏNFİ GƏLİR!**\nİstifadəçi *${req.session.user.displayName}* tərəfindən yaradılan №${orderToSave.satisNo} sifariş mənfi gəlirlə (${gelir.amount.toFixed(2)} ${gelir.currency}) yadda saxlanıldı!`;
            telegram.sendSimpleMessage(warningMessage);
        }
        const largeSaleThreshold = 10000;
        if (orderToSave.satish.amount >= largeSaleThreshold) {
            const celebrationMessage = `🎉 **BÖYÜK SATIŞ!**\n*${req.session.user.displayName}*, ${orderToSave.satish.amount.toFixed(2)} ${orderToSave.satish.currency} məbləğində yeni sifariş (№${orderToSave.satisNo}) yaratdı!`;
            telegram.sendSimpleMessage(celebrationMessage);
        }
        
        const primaryTourist = orderToSave.tourists[0];
        const actionMessage = `yeni sifariş (№${orderToSave.satisNo}) yaratdı: <b>${primaryTourist}</b>`;
        telegram.sendLog(telegram.formatLog(req.session.user, actionMessage));
        logAction(req, 'CREATE_ORDER', { satisNo: orderToSave.satisNo, tourist: primaryTourist });

        const userOrdersCount = orders.filter(o => o.createdBy === req.session.user.username).length;
        const milestones = [10, 50, 100];
        let milestoneReached = null;
        if (milestones.includes(userOrdersCount)) {
            milestoneReached = { count: userOrdersCount };
        }
        
        res.status(201).json({ 
            ...orderToSave, 
            gelir: calculateGelir(orderToSave), 
            milestone: milestoneReached
        });

    } catch (error) {
        console.error("Sifariş yaradılarkən xəta:", error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.updateOrder = (req, res) => {
    const { username, role } = req.session.user;
    const permissions = fileStore.getPermissions();
    const userPermissions = permissions[username] || {}; 

    if (role !== 'owner' && !userPermissions.canEditOrder) {
        return res.status(403).json({ message: 'Sifarişi redaktə etməyə icazəniz yoxdur.' });
    }
    try {
        const { satisNo } = req.params;
        const updatedOrderData = req.body;
        
        if (updatedOrderData.tourists && (!Array.isArray(updatedOrderData.tourists) || updatedOrderData.tourists.some(t => !t || t.trim() === ''))) {
            return res.status(400).json({ message: 'Bütün turist adları daxil edilməlidir.' });
        }

        let orders = fileStore.getOrders();
        const orderIndex = orders.findIndex(o => String(o.satisNo) === String(satisNo));
        if (orderIndex === -1) return res.status(404).json({ message: `Sifariş (${satisNo}) tapılmadı.` });

        const originalOrder = { ...orders[orderIndex] };
        req.originalOrder = originalOrder;

        let orderToUpdate = { ...orders[orderIndex] };
        
        orderToUpdate = ensurePaymentDetails(orderToUpdate);
        
        if (updatedOrderData.hotels) {
             const newHotelPaymentDetails = updatedOrderData.hotels.map(h => {
                const existing = orderToUpdate.paymentDetails.hotels.find(pdh => pdh.name === h.otelAdi);
                return { name: h.otelAdi, paid: existing ? existing.paid : false, receiptPath: h.confirmationPath || existing?.receiptPath || null };
             });
             orderToUpdate.paymentDetails.hotels = newHotelPaymentDetails;
        }

        const canEditFinancials = role === 'owner' || (userPermissions.canEditFinancials);

        if (!canEditFinancials) {
            delete updatedOrderData.alish;
            delete updatedOrderData.satish;
            delete updatedOrderData.detailedCosts;
        }

        Object.assign(orderToUpdate, updatedOrderData);
        delete orderToUpdate.turist;
        
        orderToUpdate.satisNo = satisNo;
        orders[orderIndex] = orderToUpdate;
        fileStore.saveAllOrders(orders);

        logConfirmationLinks(req, orderToUpdate);

        const gelir = calculateGelir(orderToUpdate);
        if (gelir.amount < 0) {
            const warningMessage = `🔴 **DİQQƏT: MƏNFİ GƏLİR!**\nİstifadəçi *${req.session.user.displayName}* tərəfindən düzəliş edilən №${orderToUpdate.satisNo} sifarişin gəliri mənfidir (${gelir.amount.toFixed(2)} ${gelir.currency})!`;
            telegram.sendSimpleMessage(warningMessage);
        }

        const changesText = formatChanges(originalOrder, orderToUpdate);
        
        let telegramMessage = `sifarişə (№${satisNo}) düzəliş etdi.`;
        if (changesText) {
            telegramMessage += changesText;
        }
        telegram.sendLog(telegram.formatLog(req.session.user, telegramMessage));
        
        logAction(req, 'UPDATE_ORDER', { 
            satisNo: satisNo,
            changes: changesText.replace(/<\/?b>|<\/?i>/g, '')
        });

        res.status(200).json({ message: 'Sifariş uğurla yeniləndi.'});
    } catch (error) {
        console.error("Sifariş yenilənərkən xəta:", error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.deleteOrder = (req, res) => {
    const { username, role } = req.session.user;
    const permissions = fileStore.getPermissions();
    const userPermissions = permissions[username] || {};
    
    if (role !== 'owner' && !userPermissions.canDeleteOrder) {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    try {
        let orders = fileStore.getOrders();
        const orderToDelete = orders.find(o => String(o.satisNo) === req.params.satisNo);
        if (!orderToDelete) return res.status(404).json({ message: `Sifariş tapılmadı.` });
        
        const updatedOrders = orders.filter(order => String(order.satisNo) !== req.params.satisNo);
        fileStore.saveAllOrders(updatedOrders);

        const primaryTourist = (orderToDelete.tourists && orderToDelete.tourists[0]) || orderToDelete.turist;
        telegram.sendLog(telegram.formatLog(req.session.user, `sifarişi (№${orderToDelete.satisNo}) sildi.`));
        logAction(req, 'DELETE_ORDER', { satisNo: orderToDelete.satisNo, tourist: primaryTourist });

        res.status(200).json({ message: `Sifariş uğurla silindi.` });
    } catch (error) {
        console.error("Sifariş silinərkən xəta:", error);
        res.status(500).json({ message: 'Sifariş silinərkən xəta.' });
    }
};

exports.updateOrderNote = (req, res) => {
    try {
        const { satisNo } = req.params;
        const { qeyd } = req.body;
        if (typeof qeyd === 'undefined') return res.status(400).json({ message: 'Qeyd mətni təqdim edilməyib.' });
        
        let orders = fileStore.getOrders();
        const orderIndex = orders.findIndex(o => String(o.satisNo) === String(satisNo));
        if (orderIndex === -1) return res.status(404).json({ message: `Sifariş (${satisNo}) tapılmadı.` });
        
        const originalNote = orders[orderIndex].qeyd || "";
        orders[orderIndex].qeyd = qeyd || '';
        fileStore.saveAllOrders(orders);
        
        logAction(req, 'UPDATE_NOTE', { 
            satisNo: satisNo, 
            changes: `Qeyd yeniləndi: '${originalNote}' -> '${qeyd}'`
        });

        res.status(200).json({ message: `Qeyd uğurla yeniləndi.` });
    } catch (error) {
        console.error("Qeyd yenilənərkən xəta:", error);
        res.status(500).json({ message: 'Qeyd yenilənərkən daxili server xətası.' });
    }
};

exports.searchOrderByRezNo = (req, res) => {
    try {
        const { rezNomresi } = req.params;
        if (!rezNomresi?.trim()) return res.status(400).json({ message: 'Rezervasiya nömrəsi daxil edilməyib.' });
        
        const orders = fileStore.getOrders();
        const order = orders.find(o => String(o.rezNomresi).toLowerCase() === String(rezNomresi).toLowerCase());
        
        if (order) res.json({...order, gelir: calculateGelir(order)}); 
        else res.status(404).json({ message: `Bu rezervasiya nömrəsi ilə sifariş tapılmadı.` });
    } catch (error) {
        console.error("Rezervasiya nömrəsinə görə axtarışda xəta:", error);
        res.status(500).json({ message: 'Sifariş axtarılarkən daxili server xətası.' });
    }
};

exports.getReservations = (req, res) => {
    try {
        const orders = fileStore.getOrders();
        let allReservations = [];
        orders.forEach(order => {
            const primaryTourist = (order.tourists && order.tourists[0]) || order.turist || '-';
            if (Array.isArray(order.hotels)) {
                order.hotels.forEach(hotel => {
                    if (hotel.otelAdi && hotel.girisTarixi && hotel.cixisTarixi) {
                        allReservations.push({
                            satisNo: order.satisNo,
                            turist: primaryTourist,
                            otelAdi: hotel.otelAdi,
                            girisTarixi: hotel.girisTarixi,
                            cixisTarixi: hotel.cixisTarixi,
                            adultGuests: order.adultGuests || 0,
                            childGuests: order.childGuests || 0,
                        });
                    }
                });
            }
        });
        res.json(allReservations);
    } catch (error) {
        console.error("Rezervasiyalar gətirilərkən xəta:", error);
        res.status(500).json({ message: 'Rezervasiyalar gətirilərkən xəta baş verdi.' });
    }
};

exports.getReports = (req, res) => {
    try {
        let orders = fileStore.getOrders();
        const report = {
            totalAlish: { AZN: 0, USD: 0, EUR: 0 },
            totalSatish: { AZN: 0, USD: 0, EUR: 0 },
            totalGelir: { AZN: 0, USD: 0, EUR: 0 },
            byHotel: {}
        };
        orders.forEach(order => {
            const gelir = calculateGelir(order);
            if (order.alish?.currency) report.totalAlish[order.alish.currency] += (order.alish.amount || 0);
            if (order.satish?.currency) report.totalSatish[order.satish.currency] += (order.satish.amount || 0);
            if (gelir?.currency && !gelir.note) report.totalGelir[gelir.currency] += (gelir.amount || 0);
            
            if (Array.isArray(order.hotels)) {
                order.hotels.forEach(hotel => {
                    const hotelName = hotel.otelAdi?.trim() || "Digər";
                    if (!report.byHotel[hotelName]) {
                        report.byHotel[hotelName] = { 
                            ordersCount: 0, 
                            alish: { AZN: 0, USD: 0, EUR: 0 }, 
                            satish: { AZN: 0, USD: 0, EUR: 0 }, 
                            gelir: { AZN: 0, USD: 0, EUR: 0 } 
                        };
                    }
                    report.byHotel[hotelName].ordersCount++;
                    if (order.alish?.currency) report.byHotel[hotelName].alish[order.alish.currency] += (order.alish.amount || 0);
                    if (order.satish?.currency) report.byHotel[hotelName].satish[order.satish.currency] += (order.satish.amount || 0);
                    if (gelir?.currency && !gelir.note) report.byHotel[hotelName].gelir[gelir.currency] += (gelir.amount || 0);
                });
            }
        });
        res.json(report);
    } catch (error) {
        console.error("Hesabat hazırlanarkən xəta:", error);
        res.status(500).json({ message: 'Hesabat hazırlanarkən serverdə xəta.', details: error.message });
    }
};

exports.getOrdersByCompany = (req, res) => {
    try {
        const orders = fileStore.getOrders();
        const companyName = req.query.company;

        if (!companyName) {
            const uniqueCompanies = [...new Set(orders.map(o => o.xariciSirket).filter(Boolean))];
            uniqueCompanies.sort();
            return res.json(uniqueCompanies);
        }

        const filteredOrders = orders.filter(o => o.xariciSirket === companyName);
        
        const summary = {
            totalOrders: filteredOrders.length,
            totalGelir: { AZN: 0, USD: 0, EUR: 0 },
            totalDebt: { AZN: 0, USD: 0, EUR: 0 }
        };

        const ordersWithDetails = filteredOrders.map(order => {
            const patchedOrder = ensurePaymentDetails(order);
            const gelir = calculateGelir(patchedOrder);
            
            if (gelir.currency && summary.totalGelir[gelir.currency] !== undefined) {
                summary.totalGelir[gelir.currency] += gelir.amount;
            }
            if ((!patchedOrder.paymentStatus || patchedOrder.paymentStatus === 'Ödənilməyib') && patchedOrder.satish?.currency && summary.totalDebt[patchedOrder.satish.currency] !== undefined) {
                summary.totalDebt[patchedOrder.satish.currency] += (patchedOrder.satish.amount || 0);
            }

            return {
                ...patchedOrder,
                gelir: gelir,
                overallPaymentStatus: calculateOverallPaymentStatus(patchedOrder.paymentDetails) 
            };
        });

        res.json({
            orders: ordersWithDetails,
            summary: summary
        });

    } catch (error) {
        console.error("Şirkət üzrə sifarişlər gətirilərkən xəta:", error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.getDebts = (req, res) => {
    try {
        const allOrders = fileStore.getOrders();
        let debts = allOrders.filter(order => 
            order.xariciSirket && (!order.paymentStatus || order.paymentStatus === 'Ödənilməyib')
        );

        if (req.query.company) {
            debts = debts.filter(d =>
                d.xariciSirket.toLowerCase().includes(req.query.company.toLowerCase())
            );
        }
        res.json(debts);
    } catch (error) {
        console.error("Borclar gətirilərkən xəta:", error);
        res.status(500).json({ message: 'Borclar siyahısı gətirilərkən xəta baş verdi.' });
    }
};

exports.getNotifications = (req, res) => {
    try {
        const orders = fileStore.getOrders();
        const notifications = [];
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);

        const threeDaysFromNowUTC = new Date(todayUTC);
        threeDaysFromNowUTC.setUTCDate(todayUTC.getUTCDate() + 3);

        orders.forEach(order => {
            if (!Array.isArray(order.hotels) || order.hotels.length === 0) return;

            order.hotels.forEach(hotel => {
                if (!hotel.girisTarixi) return;
                
                const checkInDate = new Date(hotel.girisTarixi);

                if (checkInDate >= todayUTC && checkInDate <= threeDaysFromNowUTC) {
                    const problemMessages = [];
                    if (!hotel.otelAdi || !hotel.cixisTarixi) problemMessages.push("Otel məlumatları natamamdır");
                    if (!order.transport || !order.transport.surucuMelumatlari) problemMessages.push("Transport məlumatı yoxdur");
                    
                    if (problemMessages.length > 0) {
                        const primaryTourist = (order.tourists && order.tourists[0]) || order.turist || '-';
                         notifications.push({
                            satisNo: order.satisNo,
                            turist: primaryTourist,
                            girisTarixi: checkInDate.toLocaleDateString('az-AZ', { timeZone: 'UTC' }),
                            problem: problemMessages.join('. ') + '.'
                        });
                    }
                }
            });
        });
        res.json(notifications);
    } catch (error) {
        console.error("Bildirişləri gətirərkən xəta:", error);
        res.status(500).json({ message: "Bildirişləri gətirmək mümkün olmadı." });
    }
};
