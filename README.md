# NoviMP - Digital Services Marketplace

A full-stack marketplace platform for proxies, virtual numbers, and SMM services built with Next.js and NestJS.

## 🚀 Features

- **Multi-Service Platform**: Proxies, Virtual Numbers, and SMM services
- **User Management**: Registration, authentication, email verification
- **Payment Integration**: Stripe payments with wallet system
- **Admin Dashboard**: Complete admin panel for managing users, orders, and providers
- **Telegram Bot**: Order notifications and admin commands
- **Provider Integration**: Automated synchronization with multiple service providers
- **Order Management**: Real-time order tracking and status updates
- **Responsive UI**: Modern, professional design with dark/light theme support

## 📁 Project Structure

```
NoviMP/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── src/
│   │   ├── prisma/
│   │   └── package.json
│   └── web/          # Next.js frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── .env.example
├── DEPLOYMENT.md
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TailwindCSS, Radix UI
- **State Management**: Zustand, TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion

### Backend
- **Framework**: NestJS 10
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis + BullMQ
- **Authentication**: JWT + Passport
- **Payments**: Stripe
- **Notifications**: Telegram Bot (Telegraf)
- **Security**: Helmet, Rate Limiting, Argon2

## 📦 Installation

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd NoviMP
```

### 2. Install Dependencies

```bash
# Install root dependencies (if using monorepo tools)
npm install

# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install
```

### 3. Environment Configuration

Copy `.env.example` files and configure:

**Backend (`apps/api/.env`)**:
```env
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/novimp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# Email
MAIL_FROM=noreply@localhost
MAIL_TRANSPORTER_HOST=smtp.mailtrap.io
MAIL_TRANSPORTER_PORT=2525
MAIL_TRANSPORTER_USER=your-username
MAIL_TRANSPORTER_PASS=your-password

# Frontend
FRONTEND_URL=http://localhost:3000
```

**Frontend (`apps/web/.env.local`)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Database Setup

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### 5. Start Development Servers

**Backend**:
```bash
cd apps/api
npm run dev
```

**Frontend**:
```bash
cd apps/web
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- Vercel (Frontend)
- Render (Backend, Database, Redis)
- Docker deployment options

## 📚 API Documentation

API documentation is available at `/api` when running the backend in development mode.

## 🧪 Testing

```bash
# Backend tests
cd apps/api
npm run test

# Frontend tests  
cd apps/web
npm run test
```

## 🔒 Security

- JWT-based authentication
- Argon2 password hashing
- Rate limiting on sensitive endpoints
- CORS configuration
- Helmet security headers
- Input validation with class-validator
- SQL injection prevention with Prisma
- XSS protection

## 📝 Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 💬 Support

For support, email support@novimp.com or open an issue in the repository.
