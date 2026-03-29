const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { sendActivationEmail } = require('../utils/email');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, fullName, phone, address } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // Create user
        const user = await User.create({
            email,
            password,
            fullName,
            phone,
            address,
            activationToken,
            activationTokenExpire
        });

        // Send activation email
        try {
            await sendActivationEmail(user.email, user.fullName, activationToken);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue even if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to activate your account.',
            data: {
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists and get password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is activated
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Please activate your account first. Check your email for activation link.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    phone: user.phone,
                    address: user.address,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @desc    Activate user account
// @route   GET /api/auth/activate/:token
// @access  Public
exports.activateAccount = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            activationToken: token,
            activationTokenExpire: { $gt: Date.now() }
        }).select('+activationToken +activationTokenExpire');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired activation token'
            });
        }

        // Activate user
        user.isActive = true;
        user.activationToken = undefined;
        user.activationTokenExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Account activated successfully. You can now login.'
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during activation'
        });
    }
};

// @desc    Resend activation email
// @route   POST /api/auth/resend-activation
// @access  Public
exports.resendActivation = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email }).select('+activationToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Account is already activated'
            });
        }

        // Generate new activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        user.activationToken = activationToken;
        user.activationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        // Send activation email
        await sendActivationEmail(user.email, user.fullName, activationToken);

        res.json({
            success: true,
            message: 'Activation email sent successfully'
        });
    } catch (error) {
        console.error('Resend activation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
