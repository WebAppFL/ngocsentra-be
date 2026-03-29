const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        subtitle: String,
        price: { type: Number, required: true },
        image: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],

    // Buyer information
    buyer: {
        title: {
            type: String,
            enum: ['Anh', 'Chị'],
            default: 'Anh'
        },
        fullName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        ward: {
            type: String,
            required: true
        }
    },

    // Shipping
    shippingMethod: {
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery'
    },
    deliveryFrom: Date,
    deliveryTo: Date,

    // Payment
    paymentMethod: {
        type: String,
        enum: ['cod', 'bank'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    payosOrderId: String,
    payosTransactionId: String,

    // Pricing
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true
    },

    // Order status
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipping', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Additional info
    note: String,
    allowPromo: {
        type: Boolean,
        default: false
    },

    // Timestamps for status changes
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date
}, {
    timestamps: true
});

// Generate order number
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString().slice(-8);
        this.orderNumber = `NST${timestamp}`;
    }
    next();
});

// Calculate total price
orderSchema.methods.calculateTotal = function () {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.totalPrice = this.subtotal + this.shippingFee - this.discount;
    return this.totalPrice;
};

module.exports = mongoose.model('Order', orderSchema);
