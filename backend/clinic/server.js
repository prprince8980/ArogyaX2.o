import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import Clinic from '../auth/models/Clinic.js';
import Appointment from '../auth/models/Appointment.js';
import CancelledSlot from '../auth/models/CancelledSlot.js';
import Account from '../auth/models/Account.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://princep4732355:princeP8980@ac-rchrg4i-shard-00-00.jwls0jw.mongodb.net:27017,ac-rchrg4i-shard-00-01.jwls0jw.mongodb.net:27017,ac-rchrg4i-shard-00-02.jwls0jw.mongodb.net:27017/?ssl=true&replicaSet=atlas-10r1tz-shard-0&authSource=admin&appName=Cluster0";

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// Connect to MongoDB with robust options
const connectMongo = async () => {
  try {
    await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
    console.log('Clinic Backend connected to MongoDB');
  } catch (err) {
    console.error('Clinic Backend failed to connect to MongoDB:', err.message);
    console.log('Trying local MongoDB...');
    try {
      await mongoose.connect('mongodb://localhost:27017/arogax2', MONGO_OPTIONS);
      console.log('Clinic Backend connected to Local MongoDB');
    } catch (localErr) {
      console.error('Clinic Backend failed to connect to Local MongoDB:', localErr.message);
      process.exit(1);
    }
  }
};

connectMongo();

// Reconnect if connection drops
mongoose.connection.on('disconnected', () => {
  console.warn('Clinic Backend: MongoDB disconnected. Reconnecting in 5s...');
  setTimeout(connectMongo, 5000);
});
mongoose.connection.on('error', (err) => {
  console.error('Clinic Backend MongoDB error:', err.message);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  }
});

app.get('/api/clinic/health', (req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ 
    status: 'Clinic backend is running', 
    database: databaseStates[mongoose.connection.readyState] || 'unknown' 
  });
});

// DB ready middleware — returns 503 immediately if MongoDB is not connected
const dbReady = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database not connected. Please try again in a moment.' 
    });
  }
  next();
};

// JWT Verification Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization header is required' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Bearer token is required' });
    }
    
    // Support mock-token for local/development flow or testing
    if (token === 'mock-token' || token.startsWith('mock_')) {
      req.user = { email: req.body.email || req.query.email || 'clinic@arogax.com' };
      return next();
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    
    // Verify expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

// PUT /api/clinic/location - Save clinic location
app.put('/api/clinic/location', dbReady, authMiddleware, async (req, res) => {
  const { latitude, longitude, clinicAddress } = req.body;
  if (latitude === undefined || longitude === undefined || !clinicAddress) {
    return res.status(400).json({ success: false, message: 'latitude, longitude, and clinicAddress are required' });
  }
  
  try {
    const email = req.user.email;
    const account = await Account.findOne({ email });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    const clinicMember = account.members.find(m => m.role === 'clinic');
    if (!clinicMember) return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const clinic = await Clinic.findByIdAndUpdate(
      clinicMember.profileId,
      {
        latitude: lat,
        longitude: lng,
        clinicAddress,
        location: {
          type: 'Point',
          coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
        }
      },
      { new: true }
    );
    
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    
    // Broadcast coordinate update to all socket connections
    io.emit('clinic_coords_updated', { clinicId: clinic._id, latitude: lat, longitude: lng });
    
    res.json({
      success: true,
      message: 'Clinic location saved successfully',
      location: {
        latitude: clinic.latitude,
        longitude: clinic.longitude,
        address: clinic.clinicAddress,
        location: clinic.location
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving location', error: error.message });
  }
});

// GET /api/clinic/location - Return logged-in clinic location
app.get('/api/clinic/location', dbReady, authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const account = await Account.findOne({ email });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    const clinicMember = account.members.find(m => m.role === 'clinic');
    if (!clinicMember) return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    
    const clinic = await Clinic.findById(clinicMember.profileId).select('latitude longitude clinicAddress location');
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    
    res.json({
      success: true,
      location: {
        latitude: clinic.latitude,
        longitude: clinic.longitude,
        address: clinic.clinicAddress,
        location: clinic.location
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching location', error: error.message });
  }
});

// PUT /api/clinic/location - Update clinic location
app.put('/api/clinic/location', dbReady, authMiddleware, async (req, res) => {
  const { latitude, longitude, clinicAddress } = req.body;
  if (latitude === undefined || longitude === undefined || !clinicAddress) {
    return res.status(400).json({ success: false, message: 'latitude, longitude, and clinicAddress are required' });
  }
  
  try {
    const email = req.user.email;
    const account = await Account.findOne({ email });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    const clinicMember = account.members.find(m => m.role === 'clinic');
    if (!clinicMember) return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const clinic = await Clinic.findByIdAndUpdate(
      clinicMember.profileId,
      {
        latitude: lat,
        longitude: lng,
        clinicAddress,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      },
      { new: true }
    );
    
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    
    io.emit('clinic_coords_updated', { clinicId: clinic._id, latitude: lat, longitude: lng });
    
    res.json({
      success: true,
      message: 'Clinic location updated successfully',
      location: {
        latitude: clinic.latitude,
        longitude: clinic.longitude,
        address: clinic.clinicAddress,
        location: clinic.location
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
});

// Fetch all clinics
app.get('/api/clinic/all', async (req, res) => {
  try {
    const clinics = await Clinic.find({});
    res.json({ success: true, clinics });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clinics', error: error.message });
  }
});

// GET /api/clinic/nearby?lat=&lng=&distance=5000 - Return nearby clinics sorted by distance
app.get('/api/clinic/nearby', async (req, res) => {
  const { lat, lng, distance } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }
  
  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = distance ? parseInt(distance) : 5000;
    
    // Find clinics near the coordinates using 2dsphere index
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
    });
    
    res.json({
      success: true,
      count: nearbyClinics.length,
      clinics: nearbyClinics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching nearby clinics', error: error.message });
  }
});

// Update clinic coordinates (legacy support, maintains geospatial standard coordinates format)
app.post('/api/clinic/coordinates', async (req, res) => {
  const { clinicId, latitude, longitude } = req.body;
  if (!clinicId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'clinicId, latitude, and longitude are required' });
  }
  try {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      {
        latitude: lat,
        longitude: lng,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      },
      { new: true }
    );
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    
    // Broadcast coordinate update to all clients
    io.emit('clinic_coords_updated', { clinicId, latitude: lat, longitude: lng });
    res.json({ success: true, clinic });
  } catch (error) {
    res.status(500).json({ message: 'Error updating coordinates', error: error.message });
  }
});

// Get slots for a clinic on a specific date
app.get('/api/clinic/slots', async (req, res) => {
  const { clinicId, date } = req.query; // date in YYYY-MM-DD
  if (!clinicId || !date) {
    return res.status(400).json({ message: 'clinicId and date are required' });
  }

  try {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    // Determine day of the week
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

    // Filter slots matching this date
    const slots = [];
    const activeSlotsConfig = clinic.availabilitySlots || [];

    for (const slotConfig of activeSlotsConfig) {
      let matches = false;
      if (slotConfig.dayType === 'everyday') {
        matches = true;
      } else if (slotConfig.dayType === 'weekday' && !isWeekend) {
        matches = true;
      } else if (slotConfig.dayType === 'weekend' && isWeekend) {
        matches = true;
      } else if (slotConfig.dayType === 'custom' && slotConfig.customDays && slotConfig.customDays.includes(dayOfWeek)) {
        matches = true;
      }

      if (matches) {
        // Check if slot was cancelled on this date
        const isCancelled = await CancelledSlot.exists({ clinicId, date, slot: slotConfig.time });
        
        // Count bookings
        const bookedCount = await Appointment.countDocuments({ 
          clinicId, 
          date, 
          slot: slotConfig.time, 
          status: 'booked' 
        });

        slots.push({
          id: slotConfig._id || slotConfig.time,
          time: slotConfig.time,
          capacity: 15,
          bookedCount,
          isCancelled: !!isCancelled,
          available: !isCancelled && bookedCount < 15,
        });
      }
    }

    res.json({ slots, dayOfWeek });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching slots', error: error.message });
  }
});

// Book appointment
app.post('/api/clinic/book', async (req, res) => {
  const { patientId, patientName, clinicId, clinicName, doctorName, date, slot, bookedBy, gender, age } = req.body;
  if (!patientId || !patientName || !clinicId || !clinicName || !doctorName || !date || !slot || !bookedBy) {
    return res.status(400).json({ message: 'All booking fields are required' });
  }

  try {
    // Check if slot is cancelled on this date
    const isCancelled = await CancelledSlot.exists({ clinicId, date, slot });
    if (isCancelled) {
      return res.status(400).json({ message: 'This slot has been cancelled by the doctor on this date' });
    }

    // Check capacity
    const bookedCount = await Appointment.countDocuments({ clinicId, date, slot, status: 'booked' });
    if (bookedCount >= 15) {
      return res.status(400).json({ message: 'This slot is fully booked' });
    }

    const appointment = new Appointment({
      patientId,
      patientName,
      clinicId,
      clinicName,
      doctorName,
      date,
      slot,
      bookedBy,
      gender,
      age,
    });

    await appointment.save();

    // Broadcast appointment_update to clinic page (to decrement remaining count) and doctor board
    io.to(`clinic_${clinicId}`).emit('appointment_booked', { appointment, bookedCount: bookedCount + 1 });
    
    // Also notify the booking user room
    io.to(`patient_${bookedBy}`).emit('my_appointment_booked', appointment);

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error booking appointment', error: error.message });
  }
});

// Get appointments for doctor (clinic) or patient (bookedBy/patientId)
app.get('/api/clinic/appointments', async (req, res) => {
  const { profileId, role } = req.query;
  if (!profileId || !role) {
    return res.status(400).json({ message: 'profileId and role are required' });
  }

  try {
    let appointments = [];
    if (role === 'clinic' || role === 'doctor') {
      appointments = await Appointment.find({ clinicId: profileId }).sort({ date: 1, slot: 1 });
    } else if (role === 'patient') {
      appointments = await Appointment.find({ 
        $or: [{ bookedBy: profileId }, { patientId: profileId }] 
      }).sort({ date: -1, slot: 1 });
    }
    res.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// Configure doctor slots
app.post('/api/clinic/doctor/slots', async (req, res) => {
  const { clinicId, availabilitySlots } = req.body;
  if (!clinicId || !availabilitySlots) {
    return res.status(400).json({ message: 'clinicId and availabilitySlots are required' });
  }

  try {
    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      { availabilitySlots },
      { new: true }
    );
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    // Notify users viewing this clinic that availability slots have changed
    io.to(`clinic_${clinicId}`).emit('slots_config_updated', { clinicId, availabilitySlots });

    res.json({ success: true, availabilitySlots: clinic.availabilitySlots });
  } catch (error) {
    res.status(500).json({ message: 'Error saving availability slots', error: error.message });
  }
});

// Cancel a specific slot date instance
app.post('/api/clinic/doctor/cancel-slot', async (req, res) => {
  const { clinicId, date, slot } = req.body;
  if (!clinicId || !date || !slot) {
    return res.status(400).json({ message: 'clinicId, date, and slot are required' });
  }

  try {
    // Record slot as cancelled for this date
    const exists = await CancelledSlot.findOne({ clinicId, date, slot });
    if (!exists) {
      await CancelledSlot.create({ clinicId, date, slot });
    }

    // Find all active booked appointments
    const appointments = await Appointment.find({ clinicId, date, slot, status: 'booked' });

    // Cancel all appointments in this slot
    await Appointment.updateMany(
      { clinicId, date, slot, status: 'booked' },
      { status: 'cancelled', cancellationReason: 'Cancelled by doctor' }
    );

    // Broadcast cancel event to patient users and the clinic room
    io.to(`clinic_${clinicId}`).emit('slot_cancelled', { clinicId, date, slot });

    appointments.forEach((app) => {
      // Notify the specific patient account that booked the appointment
      io.emit('appointment_cancelled_alert', {
        appointmentId: app._id,
        bookedBy: app.bookedBy,
        patientId: app.patientId,
        patientName: app.patientName,
        date,
        slot,
        clinicName: app.clinicName,
      });
    });

    res.json({ success: true, message: `Slot ${slot} on ${date} has been cancelled.` });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling slot', error: error.message });
  }
});

// Socket io connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Clinic backend with WebSockets running on port ${PORT}`);
});
