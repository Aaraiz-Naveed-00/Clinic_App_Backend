import express from "express";
import LegalDocument from "../models/LegalDocument.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAction } from "../middleware/logger.js";

const router = express.Router();

// Get active legal document by key (public - for mobile app)
router.get("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { language = 'tr' } = req.query;

    if (!['kvkk', 'privacy', 'terms'].includes(key)) {
      return res.status(400).json({ error: "Invalid document key" });
    }

    const document = await LegalDocument.findOne({
      key,
      language,
      isActive: true
    }).select('-createdBy');

    if (!document) {
      // Return default KVKK text if none exists
      if (key === 'kvkk') {
        return res.json({
          key: 'kvkk',
          version: '1.0.0',
          title: 'Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni',
          body: `Bu uygulama kapsamında kişisel verileriniz KVKK'ya uygun olarak işlenmektedir.

Toplanan Veriler:
- Ad, soyad
- E-posta adresi
- Telefon numarası
- Adres bilgileri

Veri İşleme Amaçları:
- Randevu yönetimi
- İletişim
- Hizmet kalitesinin artırılması

Verileriniz üçüncü taraflarla paylaşılmamaktadır ve güvenli şekilde saklanmaktadır.

Haklarınız:
- Verilerinize erişim
- Düzeltme
- Silme
- İşlemeye itiraz

İletişim: info@dentalclinic.com`,
          language: 'tr',
          publishedAt: new Date()
        });
      }
      
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Fetch legal document error:", error);
    res.status(500).json({ error: "Failed to fetch legal document" });
  }
});

// Get all legal documents for admin
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const { key, language, active, limit = 20, page = 1 } = req.query;
    
    const filter = {};
    if (key) filter.key = key;
    if (language) filter.language = language;
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const documents = await LegalDocument.find(filter)
      .sort({ key: 1, language: 1, version: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await LegalDocument.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: documents.length,
        totalDocuments: total
      }
    });
  } catch (error) {
    console.error("Fetch admin legal documents error:", error);
    res.status(500).json({ error: "Failed to fetch legal documents" });
  }
});

// Get single legal document by ID (admin)
router.get("/admin/:id", requireAdmin, async (req, res) => {
  try {
    const document = await LegalDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Fetch legal document by ID error:", error);
    res.status(500).json({ error: "Failed to fetch legal document" });
  }
});

// Create new legal document (admin only)
router.post("/", requireAdmin, logAction("CREATE_LEGAL_DOCUMENT"), async (req, res) => {
  try {
    const {
      key,
      version,
      title,
      body,
      language,
      isActive
    } = req.body;

    if (!['kvkk', 'privacy', 'terms'].includes(key)) {
      return res.status(400).json({ error: "Invalid document key" });
    }

    // Deactivate previous version if this is set as active
    if (isActive) {
      await LegalDocument.updateMany(
        { key, language },
        { isActive: false }
      );
    }

    const document = await LegalDocument.create({
      key,
      version: version || '1.0.0',
      title,
      body,
      language: language || 'tr',
      isActive: isActive !== undefined ? isActive === 'true' : true,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      document
    });
  } catch (error) {
    console.error("Create legal document error:", error);
    res.status(500).json({ error: "Failed to create legal document" });
  }
});

// Update legal document (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_LEGAL_DOCUMENT"), async (req, res) => {
  try {
    const {
      version,
      title,
      body,
      language,
      isActive
    } = req.body;

    const document = await LegalDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Deactivate other versions if this is set as active
    if (isActive === 'true' || isActive === true) {
      await LegalDocument.updateMany(
        { 
          key: document.key, 
          language: language || document.language,
          _id: { $ne: document._id }
        },
        { isActive: false }
      );
    }

    const updatedDocument = await LegalDocument.findByIdAndUpdate(
      req.params.id,
      {
        version,
        title,
        body,
        language,
        isActive: isActive === 'true' || isActive === true,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      document: updatedDocument
    });
  } catch (error) {
    console.error("Update legal document error:", error);
    res.status(500).json({ error: "Failed to update legal document" });
  }
});

// Delete legal document (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_LEGAL_DOCUMENT"), async (req, res) => {
  try {
    const document = await LegalDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    await LegalDocument.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Legal document deleted successfully"
    });
  } catch (error) {
    console.error("Delete legal document error:", error);
    res.status(500).json({ error: "Failed to delete legal document" });
  }
});

// Activate legal document version (admin only)
router.patch("/:id/activate", requireAdmin, logAction("ACTIVATE_LEGAL_DOCUMENT"), async (req, res) => {
  try {
    const document = await LegalDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Deactivate other versions
    await LegalDocument.updateMany(
      { 
        key: document.key, 
        language: document.language,
        _id: { $ne: document._id }
      },
      { isActive: false }
    );

    // Activate this version
    document.isActive = true;
    document.publishedAt = new Date();
    document.updatedAt = new Date();
    await document.save();

    res.json({
      success: true,
      document,
      message: "Legal document activated successfully"
    });
  } catch (error) {
    console.error("Activate legal document error:", error);
    res.status(500).json({ error: "Failed to activate legal document" });
  }
});

// Get current KVKK version for mobile onboarding
router.get("/kvkk/current", async (req, res) => {
  try {
    const { language = 'tr' } = req.query;

    const kvkkDocument = await LegalDocument.findOne({
      key: 'kvkk',
      language,
      isActive: true
    }).select('version title body publishedAt');

    if (!kvkkDocument) {
      // Return default KVKK
      return res.json({
        version: '1.0.0',
        title: 'KVKK Aydınlatma Metni',
        body: `KVKK Aydınlatma Metni

Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, kişisel verilerinizin işlenmesi hakkında aşağıdaki bilgileri paylaşıyoruz:

VERİ SORUMLUSU
[Klinik Adı] olarak, kişisel verilerinizin korunmasına önem veriyoruz.

İŞLENEN KİŞİSEL VERİLER
• Ad, soyad
• E-posta adresi
• Telefon numarası
• Sağlık bilgileri (randevu ve tedavi süreçleri için)

VERİLERİN İŞLENME AMAÇLARI
• Randevu yönetimi
• İletişim kurma
• Hizmet kalitesini artırma
• Yasal yükümlülüklerin yerine getirilmesi

VERİLERİN AKTARILMASI
Kişisel verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.

HAKLARINIZ
KVKK kapsamında aşağıdaki haklara sahipsiniz:
• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenen verileriniz hakkında bilgi talep etme
• Verilerin düzeltilmesini isteme
• Verilerin silinmesini talep etme

İLETİŞİM
Sorularınız için: [iletisim@klinik.com]

Bu metni okuduğunuzu ve kabul ettiğinizi onaylayarak devam edebilirsiniz.`,
        publishedAt: new Date()
      });
    }

    res.json(kvkkDocument);
  } catch (error) {
    console.error("Fetch current KVKK error:", error);
    res.status(500).json({ error: "Failed to fetch KVKK document" });
  }
});

export default router;
