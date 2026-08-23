const jwt = require('jsonwebtoken');
const jobCardRepository = require('../repositories/jobCardRepository');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * Generate a cryptographically signed 30-day access token for a customer's photo gallery
 * @param {string} jobCardId
 */
function generateGalleryToken(jobCardId) {
  return jwt.sign(
    { jobCardId, scope: 'public_gallery' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Verify a customer photo gallery token
 * @param {string} token
 * @param {string} jobCardId
 */
function verifyGalleryToken(token, jobCardId) {
  try {
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded && decoded.scope === 'public_gallery' && decoded.jobCardId === jobCardId;
  } catch (err) {
    return false;
  }
}

/**
 * Public Customer Gallery API — Fetch vehicle summary & job media via tokenized link
 * Endpoint: GET /api/job-cards/public-gallery/:id?token=...
 */
const getPublicGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers['x-gallery-token'];

    const isValidToken = verifyGalleryToken(token, id);

    // If caller has active user auth token (Admin/Technician), allow access as well
    const authHeader = req.headers['authorization'];
    let isUserAuthenticated = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const bearerToken = authHeader.split(' ')[1];
        const userDecoded = jwt.verify(bearerToken, JWT_SECRET);
        if (userDecoded && userDecoded.userId) {
          isUserAuthenticated = true;
        }
      } catch (e) {}
    }

    if (!isValidToken && !isUserAuthenticated) {
      return res.status(401).json({
        error: 'Invalid, missing, or expired gallery access token. Please request a new delivery link from the workshop.'
      });
    }

    const card = await jobCardRepository.findById(id);

    if (!card) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const latestInvoice = card.invoices && card.invoices.length > 0 ? card.invoices[0] : null;

    res.json({
      jobCard: {
        id: card.id,
        cardNumber: card.cardNumber,
        title: card.title,
        status: card.status,
        createdAt: card.createdAt,
        deliveredAt: card.deliveredAt
      },
      vehicle: card.vehicle ? {
        make: card.vehicle.make,
        model: card.vehicle.model,
        year: card.vehicle.year,
        licensePlate: card.vehicle.licensePlate,
        fuelType: card.vehicle.fuelType,
        color: card.vehicle.color
      } : null,
      customer: card.customer ? {
        name: card.customer.name
      } : null,
      invoice: latestInvoice ? {
        id: latestInvoice.id,
        invoiceNumber: latestInvoice.invoiceNumber,
        status: latestInvoice.status,
        totalAmount: latestInvoice.totalAmount
      } : null,
      media: (card.media || []).map(m => ({
        id: m.id,
        url: m.url,
        type: m.type,
        caption: m.caption,
        uploadedAt: m.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching public customer gallery:', error);
    res.status(500).json({ error: 'Failed to retrieve photo gallery' });
  }
};

module.exports = {
  generateGalleryToken,
  verifyGalleryToken,
  getPublicGalleryById
};
