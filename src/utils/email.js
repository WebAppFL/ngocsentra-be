const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });
};

// Send activation email
exports.sendActivationEmail = async (email, fullName, token) => {
  const transporter = createTransporter();

  const activationUrl = `${process.env.FRONTEND_URL}activate/${token}`;

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Kích hoạt tài khoản Ngọc Sen Trà',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Xin chào ${fullName}!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Ngọc Sen Trà.</p>
        <p>Vui lòng nhấn vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}" 
             style="background-color: #2c5f2d; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Kích hoạt tài khoản
          </a>
        </div>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p style="color: #666; word-break: break-all;">${activationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Link kích hoạt có hiệu lực trong 24 giờ.
        </p>
        <p style="color: #999; font-size: 12px;">
          Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};
