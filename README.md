# Project Management Backend API 

A comprehensive backend service for a simplified project management platform built with Node.js, Express.js, and MongoDB. Features include secure user authentication, project management, team collaboration, and premium billing integration with Razorpay.

### Features (I have added some extra endpoints than requirment)

#### Authentication & Authorization

- JWT-based authentication with refresh token flow
- Role-based access control (Admin/Member)
- Secure password hashing with bcrypt
- Session management and token rotation

#### Project Management

- Create, read, update, delete projects
- Project status and priority management
- Project statistics and analytics
- Advanced filtering and search capabilities

#### Team Collaboration

- Add/remove team members from projects
- Role-based project permissions
- Member management and role updates

#### Premium Billing

- Razorpay payment integration
- Multiple subscription plans (Monthly/Yearly)
- Payment verification and webhook handling
- Comprehensive payment history and analytics

#### Security & Performance

- Rate limiting for different endpoint types
- Input validation and sanitization
- Comprehensive error handling
- Request logging and monitoring

### 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Zod
- **Payment:** Razorpay
- **Testing:** jest
- **Security:** Helmet, CORS, bcryptjs
- **Logging:** Winston



## 🔧 Installation

1. **Clone the repository:**

```bash
git clone https://github.com/huamanraj/Project-Management-API
cd Project-Management-API
```

2. **Install dependencies:**

```bash
npm install
```

3. **Environment Configuration:**

```bash
cp .env.example .env
```

4. **Update the `.env` file with your configuration:**

Create a `.env` file in the root directory with the following configuration:

```env
# Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/project-management
# For MongoDB Atlas (cloud): mongodb+srv://username:password@cluster.mongodb.net/project-management

# JWT Configuration 
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Razorpay Configuration 
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
PAYMENT_RATE_LIMIT_MAX=3

# CORS Configuration (Frontend URLs)
FRONTEND_URL=http://localhost:3000,http://localhost:3001,http://localhost:5173
```


5. **Run the application:**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 🧪 Testing

The project includes comprehensive test suites covering authentication, project management, and integration scenarios.

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Authentication tests
npm run test:auth

# Project management tests
npm run test:projects

# Billing system tests
npm run test:billing

# Integration tests
npm run test:integration
```



## 📚 API Documentation

### Base URLs

```
# Local Development
http://localhost:3000/api

# Deployed API (Live Demo)
https://projectmanagementapi.vercel.app/api
```



### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Key Endpoints

#### Authentication

- `POST /auth/signup` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get user profile
- `POST /auth/logout` - Logout user

#### Projects (Admin Only for CRUD)

- `POST /projects` - Create project
- `GET /projects` - List projects (filtered by role)
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

#### Team Management (Admin Only)

- `POST /projects/:id/members` - Add member to project
- `GET /projects/:id/members` - List project members
- `DELETE /projects/:id/members/:userId` - Remove member
- `PATCH /projects/:id/members/:userId` - Update member role

#### Billing

- `GET /billing/plans` - Get available plans
- `POST /billing/upgrade` - Create upgrade order
- `POST /billing/verify` - Verify payment
- `GET /billing/history` - Payment history
- `GET /billing/admin/stats` - Payment statistics (Admin)

### Complete API Documentation

- **Postman Collection:** [postman/Project-Management-API.postman_collection.json](postman/Project-Management-API.postman_collection.json)



## 🏗️ Project Structure

```
src/
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── projectController.js
│   └── billingController.js
├── services/            # Business logic
│   ├── projectService.js
│   └── paymentService.js
├── models/              # Database models
│   ├── User.js
│   ├── Project.js
│   └── Payment.js
├── routes/              # Route definitions
│   ├── auth.js
│   ├── projects.js
│   ├── billing.js
│   └── index.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   ├── validation.js
│   ├── rateLimiter.js
│   └── errorHandler.js
├── utils/               # Utility functions
│   ├── jwt.js
│   └── password.js
├── config/              # Configuration files
│   ├── database.js
│   ├── logger.js
│   └── index.js
├── validators/          # Input validation schemas
│   ├── auth.js
│   ├── project.js
│   └── billing.js
├── tests/               # Test files
│   ├── setup.js
│   ├── auth.test.js
│   ├── projects.test.js
│   ├── billing.test.js
│   └── integration.test.js
├── app.js               # Express app configuration
└── server.js            # Server entry point
```

## 🔐 Security Features

### Authentication Security

- JWT tokens with configurable expiration
- Refresh token rotation
- Password strength validation
- Secure password hashing (bcrypt with 12 salt rounds)

### API Security

- Rate limiting (configurable per endpoint type)
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Request logging and monitoring

### Data Security

- MongoDB injection prevention
- XSS protection through input sanitization
- Proper error handling (no sensitive data exposure)


### Available Plans

- **Premium Monthly:** ₹999/month
- **Premium Yearly:** ₹9999/year

### Payment Flow

1. User selects a plan
2. System creates Razorpay order
3. Frontend integrates with Razorpay checkout
4. Payment verification via signature validation
5. User premium status activation

## 🚀 Deployment

### Live Deployment

**Current Deployment:** https://projectmanagementapi.vercel.app



### Health Check

The API includes a health check endpoint:

```
GET /health
```

## 📊 Monitoring & Logging

### Logging

- Winston logger with configurable levels
- Separate error and combined logs
- Console logging in development
- Structured JSON logging in production

### Monitoring

- Request/response logging middleware
- Error tracking and reporting
- Performance metrics collection
- Rate limiting statistics



## 🆘 Support & Testing

### Live API Testing

- **API Base URL:** https://projectmanagementapi.vercel.app/api
- **Health Check:** https://projectmanagementapi.vercel.app/health




