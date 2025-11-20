import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import { requestLogger } from "./middleware/logger.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import promoCardRoutes from "./routes/promoCardRoutes.js";
import homePromoRoutes from "./routes/homePromoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import clinicInfoRoutes from "./routes/clinicInfoRoutes.js";
import legalRoutes from "./routes/legalRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import imageUploadRoutes from "./routes/imageUploadRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://clinic-hub-admin.vercel.app',
    'https://your-mobile-app-domain.com',
    'https://clinic-app-backend-chi.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Clinic Management API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/promo-cards", promoCardRoutes);
app.use("/api/home-promos", homePromoRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/clinic-info", clinicInfoRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", imageUploadRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: "Validation Error",
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: "Invalid ID format"
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate entry",
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}`);
  console.log(`🏥 Clinic Management System Backend`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});