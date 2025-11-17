import express from "express";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { logAction } from "../middleware/logger.js";
import { encrypt, decrypt } from "../config/crypto.js";

const router = express.Router();

// Get user's appointments (mobile app)
router.get("/my-appointments", authenticate, async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    const filter = { patientId: req.user.id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name surname title specialty photoUrl phone')
      .sort({ appointmentDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Decrypt patient data for own appointments
    const decryptedAppointments = appointments.map(appointment => ({
      ...appointment.toObject(),
      patientPhone: decrypt(appointment.patientPhone),
      patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
    }));

    const total = await Appointment.countDocuments(filter);

    res.json({
      appointments: decryptedAppointments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: appointments.length,
        totalAppointments: total
      }
    });
  } catch (error) {
    console.error("Fetch user appointments error:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Get all appointments for admin
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const { doctorId, status, date, limit = 20, page = 1 } = req.query;
    
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name surname title specialty photoUrl')
      .sort({ appointmentDate: -1, appointmentTime: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Decrypt patient data for admin view
    const decryptedAppointments = appointments.map(appointment => ({
      ...appointment.toObject(),
      patientPhone: decrypt(appointment.patientPhone),
      patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
    }));

    const total = await Appointment.countDocuments(filter);

    res.json({
      appointments: decryptedAppointments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: appointments.length,
        totalAppointments: total
      }
    });
  } catch (error) {
    console.error("Fetch admin appointments error:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Get single appointment
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name surname title specialty photoUrl phone');
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Check if user can access this appointment
    if (req.user.authSource === 'firebase' && appointment.patientId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Decrypt patient data
    const decryptedAppointment = {
      ...appointment.toObject(),
      patientPhone: decrypt(appointment.patientPhone),
      patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
    };

    res.json(decryptedAppointment);
  } catch (error) {
    console.error("Fetch appointment error:", error);
    res.status(500).json({ error: "Failed to fetch appointment" });
  }
});

// Book new appointment (mobile app)
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      patientName,
      patientPhone,
      patientEmail,
      notes,
      treatmentType
    } = req.body;

    // Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isActive) {
      return res.status(400).json({ error: "Doctor not available" });
    }

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ error: "Time slot not available" });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      patientName,
      patientPhone: encrypt(patientPhone),
      patientEmail: patientEmail ? encrypt(patientEmail) : null,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      notes,
      treatmentType,
      status: 'scheduled'
    });

    // Populate doctor info for response
    await appointment.populate('doctorId', 'name surname title specialty photoUrl phone');

    res.status(201).json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        patientPhone: decrypt(appointment.patientPhone),
        patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
      }
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// Update appointment status (admin only)
router.patch("/:id/status", requireAdmin, logAction("UPDATE_APPOINTMENT_STATUS"), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    appointment.updatedAt = new Date();
    await appointment.save();

    await appointment.populate('doctorId', 'name surname title specialty photoUrl');

    res.json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        patientPhone: decrypt(appointment.patientPhone),
        patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
      },
      message: `Appointment ${status} successfully`
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

// Cancel appointment (user can cancel their own)
router.patch("/:id/cancel", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Check if user can cancel this appointment
    if (req.user.authSource === 'firebase' && appointment.patientId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ error: "Cannot cancel completed appointment" });
    }

    appointment.status = 'cancelled';
    appointment.updatedAt = new Date();
    await appointment.save();

    await appointment.populate('doctorId', 'name surname title specialty photoUrl');

    res.json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        patientPhone: decrypt(appointment.patientPhone),
        patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
      },
      message: "Appointment cancelled successfully"
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

// Get available time slots for a doctor on a specific date
router.get("/available-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const appointmentDate = new Date(date);
    const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Get doctor's available hours for the day
    const daySchedule = doctor.availableHours?.[dayName];
    if (!daySchedule || !daySchedule.start || !daySchedule.end) {
      return res.json({ availableSlots: [] });
    }

    // Get existing appointments for the date
    const existingAppointments = await Appointment.find({
      doctorId,
      appointmentDate,
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('appointmentTime');

    const bookedTimes = existingAppointments.map(apt => apt.appointmentTime);

    // Generate time slots (30-minute intervals)
    const slots = [];
    const startTime = daySchedule.start;
    const endTime = daySchedule.end;
    
    // Simple time slot generation (you can make this more sophisticated)
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    const availableSlots = timeSlots.filter(slot => 
      !bookedTimes.includes(slot) && 
      slot >= startTime && 
      slot <= endTime
    );

    res.json({ availableSlots });
  } catch (error) {
    console.error("Fetch available slots error:", error);
    res.status(500).json({ error: "Failed to fetch available slots" });
  }
});

export default router;
