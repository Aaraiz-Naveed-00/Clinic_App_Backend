// KVKK-compliant content validation
export const noPromotionalWords = (req, res, next) => {
  const forbiddenWords = [
    "discount", "offer", "campaign", "sale", "promotion", 
    "deal", "special", "limited", "free", "bonus",
    "indirim", "kampanya", "fırsat", "özel", "bedava"
  ];
  
  const text = JSON.stringify(req.body).toLowerCase();

  const foundWords = forbiddenWords.filter(word => text.includes(word));
  
  if (foundWords.length > 0) {
    return res.status(400).json({
      error: "Content violates KVKK promotion restrictions.",
      forbiddenWords: foundWords
    });
  }

  next();
};

// Validate required KVKK consent
export const requireKVKKConsent = (req, res, next) => {
  if (!req.body.kvkkConsent) {
    return res.status(400).json({
      error: "KVKK consent is required to proceed."
    });
  }
  next();
};
