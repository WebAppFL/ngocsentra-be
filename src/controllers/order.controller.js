const Order = require('../models/Order.model');
const payos = require('../config/payos');
const crypto = require('crypto');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        const { items, buyer, shippingMethod, paymentMethod, note, allowPromo } = req.body;

        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must have at least one item'
            });
        }

        // Calculate delivery dates
        const baseDate = new Date();
        const deliveryFrom = new Date(baseDate);
        deliveryFrom.setDate(baseDate.getDate() + 2);
        const deliveryTo = new Date(baseDate);
        deliveryTo.setDate(baseDate.getDate() + 4);

        // Generate order number
        const timestamp = Date.now().toString().slice(-8);
        const orderNumber = `NST${timestamp}`;

        // Create order
        const order = new Order({
            orderNumber,
            user: req.user._id,
            items: items.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.product.price
            })),
            buyer,
            shippingMethod,
            paymentMethod,
            note,
            allowPromo,
            deliveryFrom,
            deliveryTo,
            status: 'pending'
        });

        // Calculate total
        order.calculateTotal();

        // Save order
        await order.save();

        // If payment method is bank, create PayOS payment link
        let paymentUrl = null;
        if (paymentMethod === 'bank') {
            try {
                const payosOrderId = Date.now();

                const paymentData = {
                    orderCode: payosOrderId,
                    amount: order.totalPrice,
                    description: `DH ${order.orderNumber}`,
                    returnUrl: `${process.env.FRONTEND_URL}/dat-hang-thanh-cong?orderNumber=${order.orderNumber}`,
                    cancelUrl: `${process.env.FRONTEND_URL}/dat-hang-that-bai?orderNumber=${order.orderNumber}&error=payment_cancelled`
                };

                console.log('Creating PayOS payment link with data:', paymentData);
                const paymentLinkRes = await payos.createPaymentLink(paymentData);
                console.log('PayOS response:', paymentLinkRes);

                if (paymentLinkRes && paymentLinkRes.checkoutUrl) {
                    paymentUrl = paymentLinkRes.checkoutUrl;
                    order.payosOrderId = payosOrderId.toString();
                    await order.save();
                    console.log('Payment URL created:', paymentUrl);
                } else {
                    console.error('PayOS did not return checkoutUrl');
                }
            } catch (payosError) {
                console.error('PayOS error:', payosError);
                console.error('PayOS error message:', payosError.message);
                console.error('PayOS error response:', payosError.response?.data);
                // Continue without payment link, user can pay later
            }
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
                order: {
                    id: order._id,
                    orderNumber: order.orderNumber,
                    totalPrice: order.totalPrice,
                    status: order.status,
                    paymentMethod: order.paymentMethod,
                    deliveryFrom: order.deliveryFrom,
                    deliveryTo: order.deliveryTo
                },
                paymentUrl
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error while creating order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get order by order number
// @route   GET /api/orders/number/:orderNumber
// @access  Private
exports.getOrderByNumber = async (req, res) => {
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    PayOS webhook handler
// @route   POST /api/orders/payos-webhook
// @access  Public
exports.payosWebhook = async (req, res) => {
    try {
        const webhookData = req.body;

        // Verify webhook signature
        const data = webhookData.data;

        if (data.code === '00') {
            // Payment successful
            const order = await Order.findOne({ payosOrderId: data.orderCode.toString() });

            if (order) {
                order.paymentStatus = 'paid';
                order.paidAt = new Date();
                order.status = 'processing';
                order.payosTransactionId = data.id;
                await order.save();
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('PayOS webhook error:', error);
        res.status(500).json({ success: false });
    }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order in current status'
            });
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment-status
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.paymentStatus = paymentStatus;
        if (paymentStatus === 'paid') {
            order.paidAt = new Date();
            if (order.status === 'pending') {
                order.status = 'processing';
            }
        }
        await order.save();

        res.json({
            success: true,
            message: 'Payment status updated successfully',
            data: order
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
