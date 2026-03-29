# Ngọc Sen Trà - Backend API

Backend API cho ứng dụng Ngọc Sen Trà được xây dựng với Express.js và MongoDB.

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

3. Cấu hình các biến môi trường trong file `.env`:
   - `MONGODB_URI`: Connection string MongoDB
   - `JWT_SECRET`: Secret key cho JWT (nên dùng chuỗi ngẫu nhiên mạnh)
   - `JWT_EXPIRES_IN`: Thời gian hết hạn token (mặc định 24h)
   - `BCRYPT_ROUNDS`: Số vòng hash bcrypt (mặc định 10)
   - `MAIL_*`: Cấu hình email để gửi activation link
   - `PAYOS_*`: Cấu hình PayOS payment gateway
   - `CLOUDINARY_*`: Cấu hình Cloudinary cho upload ảnh

4. Khởi động MongoDB (nếu chạy local)

5. Chạy server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

#### Đăng ký tài khoản
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "address": "123 Đường ABC, Quận 1, TP.HCM"
}
```

#### Đăng nhập
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Kích hoạt tài khoản
```
GET /api/auth/activate/:token
```

#### Gửi lại email kích hoạt
```
POST /api/auth/resend-activation
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Lấy thông tin user hiện tại
```
GET /api/auth/me
Authorization: Bearer <token>
```

## Cấu trúc thư mục

```
src/
├── config/          # Cấu hình database, etc.
├── controllers/     # Controllers xử lý logic
├── middleware/      # Middleware (auth, validation, etc.)
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
└── server.js        # Entry point
```

## Tính năng

- ✅ Đăng ký tài khoản với validation
- ✅ Đăng nhập với JWT authentication
- ✅ Kích hoạt tài khoản qua email
- ✅ Bảo mật mật khẩu với bcrypt
- ✅ Protected routes với JWT middleware
- ✅ Error handling
- ✅ CORS enabled

## Lưu ý

- Tài khoản cần được kích hoạt qua email trước khi đăng nhập
- Token JWT có thời hạn 7 ngày (có thể thay đổi trong .env)
- Link kích hoạt có hiệu lực 24 giờ
