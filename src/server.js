const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Welcome to API 🚀'
    });
});

// Apply /api prefix to all routes
const apiRouter = express.Router();

// Mount route modules
apiRouter.use('/auth', require('./routes/auth.routes'));
apiRouter.use('/orders', require('./routes/order.routes'));

// Health check
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Mount API router with /api prefix
app.use('/api', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export for Vercel serverless
module.exports = app;
