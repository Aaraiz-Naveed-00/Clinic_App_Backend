import Log from "../models/Log.js";

// Log admin actions
export const logAction = (action) => async (req, res, next) => {
  try {
    await Log.create({
      adminId: req.user?.id || "anonymous",
      action,
      method: req.method,
      endpoint: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Logging error:", error);
    // Don't block the request if logging fails
  }
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
