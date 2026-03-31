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

// @desc    Check if email exists
// @route   POST /api/auth/check-email
// @access  Public
exports.checkEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });

        res.json({
            success: true,
            exists: !!existingUser
        });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ'
        });
    }
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
                message: 'Thông tin không hợp lệ',
                errors: errors.array()
            });
        }

        const { email, password, fullName, phone, address, dateOfBirth } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được đăng ký'
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
            dateOfBirth,
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
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản.',
            data: {
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi đăng ký'
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
                message: 'Thông tin không hợp lệ',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists and get password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Check if account is activated
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Vui lòng kích hoạt tài khoản trước. Kiểm tra email để lấy link kích hoạt.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
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
            message: 'Lỗi máy chủ khi đăng nhập'
        });
    }
};

// @desc    Activate user account
// @route   POST /api/auth/activate/:token
// @access  Public
exports.activateAccount = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            activationToken: token,
            activationTokenExpire: { $gt: Date.now() }
        }).select('+activationToken +activationTokenExpire');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Link kích hoạt không hợp lệ hoặc đã hết hạn'
            });
        }

        // Case 2: Email link activation - only activate account, don't touch password
        if (!password) {
            user.isActive = true;
            user.activationToken = undefined;
            user.activationTokenExpire = undefined;
            await user.save();

            return res.json({
                success: true,
                message: 'Kích hoạt tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.'
            });
        }

        // Case 1: Should not happen - password is already set during registration
        // This case is kept for backward compatibility but shouldn't be used
        return res.status(400).json({
            success: false,
            message: 'Yêu cầu kích hoạt không hợp lệ'
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi kích hoạt tài khoản'
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
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản đã được kích hoạt'
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
            message: 'Email kích hoạt đã được gửi thành công'
        });
    } catch (error) {
        console.error('Resend activation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ'
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
            message: 'Lỗi máy chủ'
        });
    }
};
