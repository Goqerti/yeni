// routes/api.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const permissionController = require('../controllers/permissionController');
const orderController = require('../controllers/orderController');
const musicController = require('../controllers/musicController');
const expenseController = require('../controllers/expenseController');
const inventoryController = require('../controllers/inventoryController');
const transportController = require('../controllers/transportController');
const { requireLogin, requireOwnerRole, requireFinanceOrOwner } = require('../middleware/authMiddleware');

// --- Public routes (no login required) ---
router.post('/verify-owner', userController.verifyOwner);
router.post('/users/create', userController.createUser);
router.post('/users/get-by-password', userController.getUsersByPassword);
router.put('/users/update-by-password/:usernameToUpdate', userController.updateUserByPassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/permissions/get-by-password', permissionController.getPermissionsByPassword);
router.put('/permissions/save-by-password', permissionController.savePermissionsByPassword);


// --- Authenticated routes (login required) ---
router.use(requireLogin);

// User & Permissions
router.get('/user/me', userController.getCurrentUser);
router.get('/user/permissions', permissionController.getUserPermissions);
router.get('/permissions', requireOwnerRole, permissionController.getAllPermissions);
router.put('/permissions', requireOwnerRole, permissionController.updateAllPermissions);

// User Management (Owner only)
router.get('/users', requireOwnerRole, userController.getAllUsers);
router.put('/users/:username', requireOwnerRole, userController.updateUser);
router.delete('/users/:username', requireOwnerRole, userController.deleteUser);

// Orders
router.get('/orders', orderController.getAllOrders);
router.post('/orders', orderController.createOrder);
router.put('/orders/:satisNo', orderController.updateOrder);
router.delete('/orders/:satisNo', orderController.deleteOrder);
router.put('/orders/:satisNo/note', orderController.updateOrderNote);
router.get('/orders/search/rez/:rezNomresi', orderController.searchOrderByRezNo);

// Other resources
router.get('/reservations', orderController.getReservations);
router.get('/reports', orderController.getReports);
router.get('/reports/by-company', orderController.getOrdersByCompany);
router.get('/debts', orderController.getDebts);
router.get('/notifications', orderController.getNotifications);

// Expenses Routes (Finance & Owner only)
router.get('/expenses', requireFinanceOrOwner, expenseController.getAllExpenses);
router.post('/expenses', requireFinanceOrOwner, expenseController.createExpense);
router.put('/expenses/:id', requireFinanceOrOwner, expenseController.updateExpense);
router.delete('/expenses/:id', requireFinanceOrOwner, expenseController.deleteExpense);
router.get('/expenses/filter', requireFinanceOrOwner, expenseController.getFilteredExpenses);

// Inventory Routes (Finance & Owner only)
router.get('/inventory', requireFinanceOrOwner, inventoryController.getAllItems);
router.post('/inventory', requireFinanceOrOwner, inventoryController.createItem);
router.put('/inventory/:id', requireFinanceOrOwner, inventoryController.updateItem);
router.delete('/inventory/:id', requireFinanceOrOwner, inventoryController.deleteItem);

// Transport Routes
router.get('/transport', requireLogin, transportController.getAllPackages);
router.post('/transport', requireLogin, transportController.createPackage);
router.put('/transport/:id', requireLogin, transportController.updatePackage);
router.delete('/transport/:id', requireLogin, transportController.deletePackage);

// Music (New)
router.get('/music/play', musicController.playSong);

module.exports = router;