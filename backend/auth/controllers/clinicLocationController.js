import Clinic from '../models/Clinic.js';
import Account from '../models/Account.js';

/**
 * Controller for clinic location management
 * Handles saving, updating, retrieving, and finding nearby clinics
 */

/**
 * POST /api/clinic/location
 * Save or update clinic location
 */
export const saveClinicLocation = async (req, res, db) => {
  try {
    const { email } = req.body;

    // Get the account (clinic) from the request
    let account;
    if (db.readyState === 1) {
      account = await Account.findOne({ email });
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Find the clinic profile for this account
    const clinic = account.members.find(m => m.role === 'clinic');
    if (!clinic || !clinic.profileId) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    // Get clinic profile from database
    let clinicProfile;
    if (db.readyState === 1) {
      clinicProfile = await Clinic.findById(clinic.profileId);
    }

    if (!clinicProfile) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    // Update location fields
    clinicProfile.latitude = parseFloat(req.body.latitude);
    clinicProfile.longitude = parseFloat(req.body.longitude);
    clinicProfile.location = {
      type: 'Point',
      coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)] // MongoDB uses [longitude, latitude]
    };
    clinicProfile.clinicAddress = req.body.clinicAddress || '';

    await clinicProfile.save();

    return res.json({
      success: true,
      message: 'Clinic location saved successfully',
      location: {
        latitude: clinicProfile.latitude,
        longitude: clinicProfile.longitude,
        address: clinicProfile.clinicAddress,
        location: clinicProfile.location
      }
    });

  } catch (error) {
    console.error('Error saving clinic location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save clinic location',
      error: error.message
    });
  }
};

/**
 * GET /api/clinic/location
 * Get logged-in clinic location
 */
export const getClinicLocation = async (req, res, db) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Get the account (clinic) from the request
    let account;
    if (db.readyState === 1) {
      account = await Account.findOne({ email });
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Find the clinic profile for this account
    const clinic = account.members.find(m => m.role === 'clinic');
    if (!clinic || !clinic.profileId) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    // Get clinic profile from database
    let clinicProfile;
    if (db.readyState === 1) {
      clinicProfile = await Clinic.findById(clinic.profileId).select('latitude longitude clinicAddress location');
    }

    if (!clinicProfile) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    return res.json({
      success: true,
      location: {
        latitude: clinicProfile.latitude,
        longitude: clinicProfile.longitude,
        address: clinicProfile.clinicAddress,
        location: clinicProfile.location
      }
    });

  } catch (error) {
    console.error('Error fetching clinic location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch clinic location',
      error: error.message
    });
  }
};

/**
 * PUT /api/clinic/location
 * Update clinic location (same as save, but explicit update)
 */
export const updateClinicLocation = async (req, res, db) => {
  // This is essentially the same as saveClinicLocation
  // We can just call that function
  return saveClinicLocation(req, res, db);
};

/**
 * GET /api/clinic/all
 * Return all clinics with coordinates
 */
export const getAllClinics = async (req, res, db) => {
  try {
    if (db.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    // Find all clinics that have location coordinates
    const clinics = await Clinic.find({
      location: { $exists: true, $ne: null }
    }).select('clinicName clinicAddress phoneNumber latitude longitude location accountId');

    return res.json({
      success: true,
      count: clinics.length,
      clinics: clinics
    });

  } catch (error) {
    console.error('Error fetching all clinics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch clinics',
      error: error.message
    });
  }
};

/**
 * GET /api/clinic/nearby
 * Return nearby clinics sorted by distance
 * Query params: lat, lng, distance (default: 5000 meters)
 */
export const getNearbyClinics = async (req, res, db) => {
  try {
    const { lat, lng, distance } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = distance ? parseInt(distance) : 5000; // Default 5km

    if (db.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    // Geospatial query to find clinics within maxDistance
    // MongoDB stores coordinates as [longitude, latitude]
    const nearbyClinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    }).select('clinicName clinicAddress phoneNumber latitude longitude location _id').lean();

    // Sort clinics by distance (MongoDB returns them in distance order, but we need to add the actual distance value)
    const clinicsWithDistance = nearbyClinics.map(clinic => {
      // Calculate distance using Haversine formula
      const distanceKm = calculateDistance(
        latitude,
        longitude,
        clinic.location.coordinates[1],
        clinic.location.coordinates[0]
      );

      return {
        ...clinic,
        distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
        distanceMeters: Math.round(distanceKm * 1000) // Convert to meters
      };
    });

    // Sort by distance
    clinicsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return res.json({
      success: true,
      count: clinicsWithDistance.length,
      clinics: clinicsWithDistance
    });

  } catch (error) {
    console.error('Error fetching nearby clinics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby clinics',
      error: error.message
    });
  }
};

/**
 * Haversine formula to calculate distance between two points
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
