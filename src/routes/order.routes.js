const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');

// Protected routes
router.post('/', protect, orderController.createOrder);
router.get('/', protect, orderController.getUserOrders);
router.get('/:id', protect, orderController.getOrder);
router.get('/number/:orderNumber', protect, orderController.getOrderByNumber);
router.put('/:id/cancel', protect, orderController.cancelOrder);
router.put('/:id/payment-status', protect, orderController.updatePaymentStatus);

// Public webhook route
router.post('/payos-webhook', orderController.payosWebhook);

module.exports = router;
