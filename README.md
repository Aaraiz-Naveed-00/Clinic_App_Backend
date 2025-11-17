# Clinic Management System Backend

A comprehensive MERN stack backend for clinic management with dual authentication (Firebase for mobile, Supabase for admin), KVKK compliance, and AES encryption.

## 🚀 Features

- **Dual Authentication System**
  - Firebase Auth for mobile app users
  - Supabase JWT for admin panel
  - Universal middleware supporting both

- **KVKK Compliance**
  - AES encryption for sensitive user data (email, phone, address)
  - KVKK consent tracking
  - Content validation to prevent promotional material

- **Complete API Coverage**
  - User authentication and profile management
  - Doctor management with photo uploads
  - Blog system with rich content
  - Announcements with targeting
  - Promo cards management
  - Appointment booking system
  - Admin dashboard with analytics

- **Security Features**
  - Encrypted PII data storage
  - Comprehensive logging system
  - File upload validation
  - Rate limiting ready
  - Input sanitization

## 📁 Project Structure

```
Backend/
├── config/
│   ├── database.js          # MongoDB connection
│   ├── crypto.js            # AES encryption utilities
│   ├── cloudinary.js        # Image upload configuration
│   └── firebase.js          # Firebase Admin SDK setup
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── upload.js            # File upload handling
│   ├── contentValidator.js  # KVKK content validation
│   └── logger.js            # Request logging
├── models/
│   ├── User.js              # User model with encrypted fields
│   ├── Doctor.js            # Doctor profiles
│   ├── Blog.js              # Blog posts
│   ├── Announcement.js      # System announcements
│   ├── PromoCard.js         # Promotional cards
│   ├── Appointment.js       # Appointment bookings
│   └── Log.js               # Activity logs
├── routes/
│   ├── authRoutes.js        # Authentication endpoints
│   ├── doctorRoutes.js      # Doctor management
│   ├── blogRoutes.js        # Blog management
│   ├── announcementRoutes.js # Announcements
│   ├── promoCardRoutes.js   # Promo cards
│   ├── appointmentRoutes.js # Appointment system
│   └── adminRoutes.js       # Admin dashboard
├── .env                     # Environment variables
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md               # This file
```

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Environment Configuration
Update the `.env` file with your credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/clinic-db

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# AES Encryption
AES_SECRET=your-aes-encryption-secret-key

# Cloudinary Configuration
CLOUDINARY_CLOUD=your-cloudinary-cloud-name
CLOUDINARY_KEY=your-cloudinary-api-key
CLOUDINARY_SECRET=your-cloudinary-api-secret

# Supabase Configuration (for admin panel JWT verification)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Firebase Configuration (for mobile app)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 3. Required Services Setup

#### MongoDB
- Install MongoDB locally or use MongoDB Atlas
- Update `MONGO_URI` in `.env`

#### Cloudinary (Free Tier)
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your cloud name, API key, and API secret
3. Update Cloudinary variables in `.env`

#### Firebase (for mobile app auth)
1. Create a Firebase project
2. Generate a service account key
3. Update Firebase variables in `.env`

#### Supabase (for admin panel auth)
1. Get your Supabase project URL and JWT secret
2. Update Supabase variables in `.env`

### 4. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📱 API Endpoints

### Authentication (Mobile & Admin)
- `POST /api/auth/register` - Register new user (mobile)
- `POST /api/auth/login` - User login (mobile)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Doctors (Mobile & Admin)
- `GET /api/doctors` - Get all active doctors (public)
- `GET /api/doctors/:id` - Get doctor by ID
- `POST /api/doctors` - Create doctor (admin only)
- `PUT /api/doctors/:id` - Update doctor (admin only)
- `DELETE /api/doctors/:id` - Delete doctor (admin only)
- `PATCH /api/doctors/:id/toggle-status` - Toggle doctor status

### Blogs (Mobile & Admin)
- `GET /api/blogs` - Get published blogs (public, mobile format)
- `GET /api/blogs/admin` - Get all blogs (admin)
- `GET /api/blogs/:id` - Get blog by ID
- `POST /api/blogs` - Create blog (admin only)
- `PUT /api/blogs/:id` - Update blog (admin only)
- `DELETE /api/blogs/:id` - Delete blog (admin only)
- `PATCH /api/blogs/:id/toggle-publish` - Toggle publish status
- `POST /api/blogs/:id/like` - Like blog

### Home Promos (Mobile Specific)
- `GET /api/home-promos` - Get active home promos (mobile)
- `GET /api/home-promos/admin` - Get all home promos (admin)
- `GET /api/home-promos/:id` - Get home promo by ID
- `POST /api/home-promos` - Create home promo (admin only)
- `PUT /api/home-promos/:id` - Update home promo (admin only)
- `DELETE /api/home-promos/:id` - Delete home promo (admin only)
- `PUT /api/home-promos/reorder` - Reorder home promos

### Notifications (Mobile & Admin)
- `GET /api/notifications` - Get active notifications (mobile)
- `GET /api/notifications/admin` - Get all notifications (admin)
- `GET /api/notifications/:id` - Get notification by ID
- `POST /api/notifications` - Create notification (admin only)
- `PUT /api/notifications/:id` - Update notification (admin only)
- `DELETE /api/notifications/:id` - Delete notification (admin only)
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/blog-published` - Auto-create blog notification

### Bookmarks (Mobile Specific)
- `GET /api/bookmarks` - Get user's bookmarks (mobile)
- `POST /api/bookmarks/:blogId` - Add bookmark (mobile)
- `DELETE /api/bookmarks/:blogId` - Remove bookmark (mobile)
- `GET /api/bookmarks/check/:blogId` - Check if bookmarked (mobile)
- `GET /api/bookmarks/alt` - Alternative bookmark implementation
- `POST /api/bookmarks/alt/:blogId` - Alternative add bookmark
- `DELETE /api/bookmarks/alt/:blogId` - Alternative remove bookmark

### Clinic Info (Mobile & Admin)
- `GET /api/clinic-info` - Get clinic information (mobile)
- `GET /api/clinic-info/admin` - Get clinic info (admin)
- `POST /api/clinic-info` - Create/update clinic info (admin only)
- `PUT /api/clinic-info/working-hours` - Update working hours (admin)
- `PUT /api/clinic-info/social-links` - Update social links (admin)
- `GET /api/clinic-info/contact` - Get contact info (mobile simplified)

### Legal Documents (Mobile & Admin)
- `GET /api/legal/:key` - Get legal document by key (mobile)
- `GET /api/legal/admin/all` - Get all legal documents (admin)
- `GET /api/legal/admin/:id` - Get legal document by ID (admin)
- `POST /api/legal` - Create legal document (admin only)
- `PUT /api/legal/:id` - Update legal document (admin only)
- `DELETE /api/legal/:id` - Delete legal document (admin only)
- `PATCH /api/legal/:id/activate` - Activate document version (admin)
- `GET /api/legal/kvkk/current` - Get current KVKK for onboarding

### Announcements (Mobile & Admin)
- `GET /api/announcements` - Get active announcements (public)
- `GET /api/announcements/admin` - Get all announcements (admin)
- `POST /api/announcements` - Create announcement (admin only)
- `PUT /api/announcements/:id` - Update announcement (admin only)
- `DELETE /api/announcements/:id` - Delete announcement (admin only)

### Promo Cards (Admin Only)
- `GET /api/promo-cards` - Get active promo cards (public)
- `GET /api/promo-cards/admin` - Get all promo cards (admin)
- `POST /api/promo-cards` - Create promo card (admin only)
- `PUT /api/promo-cards/:id` - Update promo card (admin only)
- `DELETE /api/promo-cards/:id` - Delete promo card (admin only)
- `PUT /api/promo-cards/reorder` - Reorder promo cards

### Appointments (Mobile & Admin)
- `GET /api/appointments/my-appointments` - Get user appointments
- `GET /api/appointments/admin` - Get all appointments (admin)
- `POST /api/appointments` - Book appointment
- `PATCH /api/appointments/:id/status` - Update appointment status (admin)
- `PATCH /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/appointments/available-slots/:doctorId/:date` - Get available slots

### Admin Dashboard
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/logs` - Get activity logs
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/toggle-status` - Toggle user status
- `GET /api/admin/health` - System health check
- `GET /api/admin/export/:type` - Export data
- `DELETE /api/admin/logs/cleanup` - Cleanup old logs

## 🔐 Authentication Flow

### Mobile App (Firebase)
1. User signs in with Firebase (email/password or SSO)
2. Firebase returns ID token
3. Mobile app sends requests with `Authorization: Bearer <firebase_id_token>`
4. Backend verifies token with Firebase Admin SDK

### Admin Panel (Supabase)
1. Admin signs in through Supabase
2. Frontend stores Supabase JWT in localStorage
3. Admin requests include `Authorization: Bearer <supabase_jwt>`
4. Backend verifies token with Supabase API

### Universal Middleware
The `authenticate` middleware tries both Firebase and Supabase verification, tagging requests with `authSource` for proper authorization.

## 🛡️ Security Features

### Data Encryption
- User email, phone, and address are AES encrypted
- Passwords are bcrypt hashed with salt rounds 12
- Appointment patient data is encrypted

### Content Validation
- KVKK compliance prevents promotional content
- File upload validation (images only, 5MB limit)
- Input sanitization and validation

### Logging
- All admin actions are logged
- Request logging with timing
- Automatic log cleanup functionality

## 🚀 Deployment

### Environment Variables
Ensure all production environment variables are set:
- Use strong, unique secrets for JWT and AES
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Use production database URLs

### Recommended Deployment Platforms
- **Heroku** - Easy deployment with MongoDB Atlas
- **Railway** - Modern deployment platform
- **DigitalOcean App Platform** - Scalable hosting
- **AWS/GCP/Azure** - Enterprise solutions

### Production Checklist
- [ ] Set strong JWT and AES secrets
- [ ] Configure production database
- [ ] Set up Cloudinary account
- [ ] Configure Firebase service account
- [ ] Set up Supabase project
- [ ] Configure CORS for your domains
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 📊 Monitoring

The API includes built-in monitoring endpoints:
- `GET /api/admin/health` - System health check
- `GET /api/admin/stats` - Usage statistics
- `GET /api/admin/logs` - Activity logs

## 🤝 Integration with Frontend

### Admin Panel Integration
The admin panel should:
1. Store Supabase JWT in localStorage on login
2. Include JWT in all API requests
3. Handle token refresh as needed

### Mobile App Integration
The mobile app should:
1. Use Firebase Auth for user authentication
2. Send Firebase ID token with API requests
3. Handle token refresh automatically

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the API documentation above
2. Review error logs in the console
3. Test endpoints with the health check endpoint
4. Verify environment variables are correctly set

---

**Ready to run!** 🎉

Start the server with `npm run dev` and visit `http://localhost:5000` to see the API status.
