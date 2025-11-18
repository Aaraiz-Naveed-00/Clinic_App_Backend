import Doctor from "../models/Doctor.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "../middleware/logger.js";

// Get all active doctors (public)
export const getAllDoctors = async (req, res) => {
  try {
    const { limit = 20, page = 1, specialty } = req.query;
    
    const filter = { isActive: true };
    if (specialty) filter.specialty = specialty;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await Doctor.find(filter)
      .select('fullName title specialty university experience imageUrl photoUrl bio rating patients languages')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Doctor.countDocuments(filter);

    res.json({
      doctors,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: doctors.length,
        totalDoctors: total
      }
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ error: "Failed to fetch doctor" });
  }
};

// Create new doctor (admin only)
export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      surname,
      title,
      specialty,
      university,
      experience,
      phone,
      email,
      bio,
      description,
      rating,
      patients,
      languages,
      clinicId,
      isActive
    } = req.body;

    // Allow image URL from body when using separate upload endpoint
    let imageUrl = req.body.imageUrl || req.body.photoUrl || "";
    
    // Upload image to Cloudinary if a file is provided directly
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "doctors",
              transformation: [
                { width: 400, height: 400, crop: "fill" },
                { quality: "auto" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    const doctor = await Doctor.create({
      name,
      surname,
      title,
      specialty,
      university,
      experience,
      phone,
      email,
      imageUrl,
      photoUrl: imageUrl,
      bio,
      description,
      rating: parseFloat(rating) || 0,
      patients: parseInt(patients) || 0,
      languages: languages ? languages.split(',').map(l => l.trim()) : [],
      clinicId: clinicId || null,
      isActive: isActive !== undefined ? isActive === 'true' : true
    });

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      doctor
    });
  } catch (error) {
    console.error("Create doctor error:", error);
    res.status(500).json({ error: "Failed to create doctor" });
  }
};

// Update doctor (admin only)
export const updateDoctor = async (req, res) => {
  try {
    const {
      name,
      surname,
      title,
      specialty,
      university,
      experience,
      phone,
      email,
      bio,
      description,
      rating,
      patients,
      languages,
      clinicId,
      isActive
    } = req.body;

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    let imageUrl = doctor.imageUrl;

    // If an explicit image URL is provided, prefer it when no new file is uploaded
    if (!req.file && (req.body.imageUrl || req.body.photoUrl)) {
      imageUrl = req.body.imageUrl || req.body.photoUrl;
    }

    // Upload new image if provided as file
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "doctors",
              transformation: [
                { width: 400, height: 400, crop: "fill" },
                { quality: "auto" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        name,
        surname,
        title,
        specialty,
        university,
        experience,
        phone,
        email,
        imageUrl,
        photoUrl: imageUrl,
        bio,
        description,
        rating: parseFloat(rating) || 0,
        patients: parseInt(patients) || 0,
        languages: languages ? languages.split(',').map(l => l.trim()) : [],
        clinicId: clinicId || null,
        isActive: isActive === 'true',
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Doctor updated successfully",
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error("Update doctor error:", error);
    res.status(500).json({ error: "Failed to update doctor" });
  }
};

// Delete doctor (admin only)
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    await Doctor.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Doctor deleted successfully"
    });
  } catch (error) {
    console.error("Delete doctor error:", error);
    res.status(500).json({ error: "Failed to delete doctor" });
  }
};

// Toggle doctor status (admin only)
export const toggleDoctorStatus = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    doctor.isActive = !doctor.isActive;
    doctor.updatedAt = new Date();
    await doctor.save();

    res.json({
      success: true,
      message: `Doctor ${doctor.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: doctor.isActive
    });
  } catch (error) {
    console.error("Toggle doctor status error:", error);
    res.status(500).json({ error: "Failed to toggle doctor status" });
  }
};

// Get all doctors for admin (includes inactive)
export const getAllDoctorsAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, active, specialty } = req.query;
    
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (specialty) filter.specialty = specialty;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await Doctor.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Doctor.countDocuments(filter);

    res.json({
      doctors,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: doctors.length,
        totalDoctors: total
      }
    });
  } catch (error) {
    console.error("Get admin doctors error:", error);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
};
