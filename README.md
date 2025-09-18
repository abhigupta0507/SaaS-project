# Multi-Tenant SaaS Notes Application - Backend

A secure, scalable multi-tenant SaaS application for managing notes with role-based access control and subscription feature gating.

## 🏗️ Architecture

### Multi-Tenancy Approach
This application uses **Shared Schema with Tenant ID** approach for multi-tenancy:

- **Single Database**: All tenants share the same MongoDB database
- **Tenant Isolation**: Each document contains a `tenant` field for strict data isolation
- **Scalability**: Easy to scale and maintain with MongoDB's native sharding capabilities
- **Cost Effective**: Lower infrastructure costs compared to separate databases per tenant

**Why this approach?**
- Simpler deployment and maintenance
- Better resource utilization
- Built-in data isolation through application-level filtering
- Easy to implement cross-tenant analytics if needed in future

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Member)
- Secure password hashing with bcrypt
- Session management

### Multi-Tenancy
- Complete tenant isolation
- Shared schema with tenant ID filtering
- Tenant-scoped queries and operations

### Subscription Management
- **Free Plan**: Limited to 3 notes per tenant
- **Pro Plan**: Unlimited notes
- Admin-only subscription upgrades

### Notes Management
- Full CRUD operations for notes
- Tenant-scoped note access
- Tag-based organization
- Search and filtering capabilities
- Pagination support

## 📋 API Endpoints

### Authentication
```
POST /api/auth/login         # User login
GET  /api/auth/profile       # Get current user profile
POST /api/auth/invite        # Invite user (Admin only)
PUT  /api/auth/password      # Change password
```

### Notes
```
GET    /api/notes           # List all notes (with pagination, search, filters)
POST   /api/notes           # Create a new note
GET    /api/notes/:id       # Get specific note
PUT    /api/notes/:id       # Update note (own notes + admin can edit any)
DELETE /api/notes/:id       # Delete note (own notes + admin can delete any)
GET    /api/notes/stats     # Get notes statistics
```

### Tenants
```
GET    /api/tenants/:slug              # Get tenant information
POST   /api/tenants/:slug/upgrade      # Upgrade to Pro plan (Admin only)
GET    /api/tenants/:slug/users        # List tenant users (Admin only)
PUT    /api/tenants/:slug/users/:id/role  # Update user role (Admin only)
DELETE /api/tenants/:slug/users/:id    # Deactivate user (Admin only)
```

### Health Check
```
GET /health  # API health status
```

## 🧪 Test Accounts

The following test accounts are available (password: `password`):

### Acme Tenant
- `admin@acme.test` - Admin role
- `user@acme.test` - Member role

### Globex Tenant
- `admin@globex.test` - Admin role
- `user@globex.test` - Member role

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notes-saas-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/notes-saas
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 🌐 Deployment on Vercel

### Setup
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   In Vercel dashboard, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Your JWT secret key
   - `FRONTEND_URL`: Your frontend Vercel URL

### Production Environment Variables
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET  
vercel env add FRONTEND_URL
```

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: Request rate limiting per IP
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: express-validator for request validation
- **Tenant Isolation**: Application-level data isolation

## 📊 Database Schema

### User
```javascript
{
  email: String (unique per tenant),
  password: String (hashed),
  role: ["admin", "member"],
  tenant: ObjectId (ref: Tenant),
  isActive: Boolean
}
```

### Tenant
```javascript
{
  name: String,
  slug: String (unique),
  subscription: {
    plan: ["free", "pro"],
    upgraded_at: Date
  },
  settings: {
    max_notes: Number
  }
}
```

### Note
```javascript
{
  title: String,
  content: String,
  author: ObjectId (ref: User),
  tenant: ObjectId (ref: Tenant),
  tags: [String],
  isArchived: Boolean
}
```

## 🚦 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [...] // For validation errors
}
```

## 📈 Features Implemented

✅ Multi-tenant architecture with data isolation  
✅ JWT authentication with role-based access  
✅ Subscription feature gating (Free/Pro plans)  
✅ Complete Notes CRUD with tenant scoping  
✅ User management (invite, role updates, deactivation)  
✅ Input validation and error handling  
✅ Security middleware (helmet, CORS, rate limiting)  
✅ Database seeding with test accounts  
✅ Vercel deployment configuration  
✅ Health check endpoint  
✅ Comprehensive API documentation  

## 🔧 Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run seed` - Seed database with test data
- `npm test` - Run tests (if implemented)

## 📝 License

MIT License - see LICENSE file for details.
