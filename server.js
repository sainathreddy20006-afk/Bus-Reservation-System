/**
 * Sainath Bus Reservation System
 * Express Server & RESTful API Implementation
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
  name: 'sainath_session_id',
  secret: process.env.SESSION_SECRET || 'sainath_bus_reservation_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Guard Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.passenger_id) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in to continue.'
  });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Administrator access is required.'
  });
}

function validateBusInput(body) {
  const fields = ['bus_no', 'bus_name', 'source', 'destination', 'departure_time',
    'arrival_time', 'duration', 'bus_type', 'travel_date'];
  for (const field of fields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return `A valid ${field.replace(/_/g, ' ')} is required.`;
    }
  }

  const totalSeats = Number(body.total_seats);
  const fare = Number(body.fare);
  if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 100) {
    return 'Total seats must be a whole number between 1 and 100.';
  }
  if (!Number.isFinite(fare) || fare <= 0) {
    return 'Fare must be a positive amount.';
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.departure_time) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(body.arrival_time)) {
    return 'Departure and arrival times must use HH:MM or HH:MM:SS format.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.travel_date) ||
      Number.isNaN(Date.parse(`${body.travel_date}T00:00:00`))) {
    return 'Travel date must use YYYY-MM-DD format.';
  }
  if (body.bus_no.trim().length > 20 || body.bus_name.trim().length > 100 ||
      body.source.trim().length > 50 || body.destination.trim().length > 50 ||
      body.duration.trim().length > 30 || body.bus_type.trim().length > 50) {
    return 'One or more bus fields exceed the allowed length.';
  }
  return null;
}

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT APIS
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new passenger
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!/^\d{10}$/.test(trimmedPhone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Check duplicate email
    const existing = await db.query('SELECT * FROM passengers WHERE email = ?', [trimmedEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const insertResult = await db.query(
      'INSERT INTO passengers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedEmail, trimmedPhone, passwordHash]
    );

    const passengerId = insertResult.insertId;

    // Auto-login newly registered user
    req.session.user = {
      passenger_id: passengerId,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: 'MEMBER'
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Sainath Bus Reservation.',
      user: {
        passenger_id: passengerId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        role: 'MEMBER'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and initiate session
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Look up user
    const users = await db.query('SELECT * FROM passengers WHERE email = ?', [trimmedEmail]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Save session
    req.session.user = {
      passenger_id: user.passenger_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || 'MEMBER'
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        passenger_id: user.passenger_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'MEMBER'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
});

/**
 * POST /api/auth/logout
 * Terminate user session
 */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
    }
    res.clearCookie('sainath_session_id');
    return res.json({ success: true, message: 'Successfully logged out.' });
  });
});

/**
 * GET /api/auth/me
 * Check current authentication state
 */
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  return res.json({
    authenticated: false,
    user: null
  });
});

/**
 * GET /api/admin/dashboard
 * Show member and confirmed booking counts to administrators.
 */
app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [memberCounts, bookingCounts, busCounts, bookings, members, buses] = await Promise.all([
      db.query(
        "SELECT COUNT(*) AS total_members FROM passengers WHERE role = 'MEMBER'"
      ),
      db.query(
        `SELECT COUNT(DISTINCT bk.passenger_id) AS booked_members,
                COUNT(*) AS confirmed_seats
         FROM bookings bk
         JOIN passengers p ON p.passenger_id = bk.passenger_id
         WHERE bk.status = 'CONFIRMED' AND p.role = 'MEMBER'`
      ),
      db.query('SELECT COUNT(*) AS total_buses FROM buses WHERE is_active = 1'),
      db.query(
        `SELECT bk.booking_id, bk.booking_ref, bk.booking_date, bk.seat_no,
                bk.passenger_name, bk.passenger_age, bk.passenger_gender,
                bk.fare, bk.status, p.passenger_id, p.name AS member_name,
                p.email AS member_email, p.phone AS member_phone,
                b.bus_id, b.bus_no, b.bus_name, b.source, b.destination,
                b.departure_time, b.arrival_time, b.duration, b.bus_type,
                b.travel_date
         FROM bookings bk
         JOIN passengers p ON p.passenger_id = bk.passenger_id
         JOIN buses b ON b.bus_id = bk.bus_id
         WHERE p.role = 'MEMBER'
         ORDER BY bk.booking_date DESC, bk.booking_id DESC`
      ),
      db.query(
        `SELECT p.passenger_id, p.name, p.email, p.phone, p.created_at,
                COUNT(DISTINCT CASE WHEN bk.status = 'CONFIRMED' THEN bk.booking_ref END) AS booking_count,
                COUNT(CASE WHEN bk.status = 'CONFIRMED' THEN 1 END) AS confirmed_seats
         FROM passengers p
         LEFT JOIN bookings bk ON bk.passenger_id = p.passenger_id
         WHERE p.role = 'MEMBER'
         GROUP BY p.passenger_id, p.name, p.email, p.phone, p.created_at
         ORDER BY p.created_at DESC`
      ),
      db.query('SELECT * FROM buses ORDER BY travel_date DESC, departure_time ASC')
    ]);

    return res.json({
      success: true,
      stats: {
        total_members: Number(memberCounts[0]?.total_members || 0),
        booked_members: Number(bookingCounts[0]?.booked_members || 0),
        confirmed_seats: Number(bookingCounts[0]?.confirmed_seats || 0),
        total_buses: Number(busCounts[0]?.total_buses || 0)
      },
      bookings,
      members,
      buses
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load the admin dashboard.'
    });
  }
});

app.post('/api/admin/buses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const validationError = validateBusInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    const bus = req.body;
    const result = await db.query(
      `INSERT INTO buses
       (bus_no, bus_name, source, destination, departure_time, arrival_time,
        duration, total_seats, available_seats, fare, bus_type, travel_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [bus.bus_no.trim(), bus.bus_name.trim(), bus.source.trim(), bus.destination.trim(),
        bus.departure_time, bus.arrival_time, bus.duration.trim(), Number(bus.total_seats),
        Number(bus.total_seats), Number(bus.fare), bus.bus_type.trim(), bus.travel_date]
    );
    return res.status(201).json({ success: true, bus_id: result.insertId, message: 'Bus added.' });
  } catch (error) {
    console.error('Admin add bus error:', error);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate ? 'A bus with this number already exists.' : 'Failed to add bus.'
    });
  }
});

app.put('/api/admin/buses/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const validationError = validateBusInput(req.body);
    const busId = Number(req.params.id);
    if (!Number.isInteger(busId) || busId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid bus ID.' });
    }
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updated = await db.executeTransaction(async conn => {
      const [buses] = await conn.query('SELECT * FROM buses WHERE bus_id = ? FOR UPDATE', [busId]);
      if (!buses.length) throw { statusCode: 404, message: 'Bus not found.' };
      const [confirmed] = await conn.query(
        "SELECT seat_no FROM bookings WHERE bus_id = ? AND status = 'CONFIRMED'",
        [busId]
      );
      const totalSeats = Number(req.body.total_seats);
      if (confirmed.length > totalSeats ||
          confirmed.some(booking => !/^\d+$/.test(String(booking.seat_no)) || Number(booking.seat_no) > totalSeats)) {
        throw { statusCode: 409, message: 'Seat capacity cannot be reduced below the current confirmed seats.' };
      }
      const active = req.body.is_active === false || req.body.is_active === 0 ? 0 : 1;
      await conn.query(
        `UPDATE buses SET bus_no = ?, bus_name = ?, source = ?, destination = ?,
         departure_time = ?, arrival_time = ?, duration = ?, total_seats = ?,
         available_seats = ?, fare = ?, bus_type = ?, travel_date = ?, is_active = ?
         WHERE bus_id = ?`,
        [req.body.bus_no.trim(), req.body.bus_name.trim(), req.body.source.trim(),
          req.body.destination.trim(), req.body.departure_time, req.body.arrival_time,
          req.body.duration.trim(), totalSeats, totalSeats - confirmed.length,
          Number(req.body.fare), req.body.bus_type.trim(), req.body.travel_date, active, busId]
      );
      return true;
    });
    return res.json({ success: updated, message: 'Bus details updated.' });
  } catch (error) {
    console.error('Admin update bus error:', error);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    const status = duplicate ? 409 : (error.statusCode || 500);
    return res.status(status).json({
      success: false,
      message: duplicate ? 'A bus with this number already exists.' :
        (error.message || 'Failed to update bus.')
    });
  }
});

app.delete('/api/admin/buses/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const busId = Number(req.params.id);
    if (!Number.isInteger(busId) || busId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid bus ID.' });
    }
    await db.executeTransaction(async conn => {
      const [buses] = await conn.query('SELECT * FROM buses WHERE bus_id = ? FOR UPDATE', [busId]);
      if (!buses.length) throw { statusCode: 404, message: 'Bus not found.' };
      const [confirmed] = await conn.query(
        "SELECT booking_id FROM bookings WHERE bus_id = ? AND status = 'CONFIRMED'",
        [busId]
      );
      if (confirmed.length) {
        throw { statusCode: 409, message: 'Cancel all confirmed bookings before removing this bus from sale.' };
      }
      await conn.query('UPDATE buses SET is_active = 0 WHERE bus_id = ?', [busId]);
    });
    return res.json({ success: true, message: 'Bus removed from sale. Booking history was preserved.' });
  } catch (error) {
    console.error('Admin remove bus error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to remove bus.'
    });
  }
});

app.patch('/api/admin/buses/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const busId = Number(req.params.id);
    if (!Number.isInteger(busId) || busId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid bus ID.' });
    }
    const result = await db.query('UPDATE buses SET is_active = 1 WHERE bus_id = ?', [busId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Bus not found.' });
    }
    return res.json({ success: true, message: 'Bus is available for sale again.' });
  } catch (error) {
    console.error('Admin restore bus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore bus.' });
  }
});

app.put('/api/admin/bookings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { passenger_name, passenger_age, passenger_gender, seat_no, fare, status } = req.body;
    const age = Number(passenger_age);
    const updatedFare = Number(fare);
    const updatedSeat = String(seat_no || '').trim();
    if (!Number.isInteger(bookingId) || bookingId < 1 ||
        typeof passenger_name !== 'string' || !passenger_name.trim() || passenger_name.trim().length > 100 ||
        !Number.isInteger(age) || age < 1 || age > 120 ||
        !['Male', 'Female', 'Other'].includes(passenger_gender) ||
        !/^\d+$/.test(updatedSeat) ||
        !Number.isFinite(updatedFare) || updatedFare <= 0 ||
        !['CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Enter valid passenger, seat, fare, and status details.' });
    }

    await db.executeTransaction(async conn => {
      const [rows] = await conn.query(
        `SELECT bk.*, b.total_seats FROM bookings bk
         JOIN buses b ON b.bus_id = bk.bus_id WHERE bk.booking_id = ? FOR UPDATE`,
        [bookingId]
      );
      if (!rows.length) throw { statusCode: 404, message: 'Booking not found.' };
      const booking = rows[0];
      if (Number(updatedSeat) > Number(booking.total_seats)) {
        throw { statusCode: 400, message: 'Seat number exceeds this bus capacity.' };
      }
      if (status === 'CONFIRMED') {
        const [duplicates] = await conn.query(
          "SELECT booking_id FROM bookings WHERE bus_id = ? AND seat_no = ? AND status = 'CONFIRMED' AND booking_id <> ?",
          [booking.bus_id, updatedSeat, bookingId]
        );
        if (duplicates.length) throw { statusCode: 409, message: 'That seat is already confirmed for this bus.' };
      }
      if (booking.status !== status) {
        if (status === 'CANCELLED') {
          await conn.query('UPDATE buses SET available_seats = available_seats + 1 WHERE bus_id = ?', [booking.bus_id]);
        } else {
          const [buses] = await conn.query('SELECT available_seats, is_active FROM buses WHERE bus_id = ? FOR UPDATE', [booking.bus_id]);
          if (!buses.length || Number(buses[0].is_active) === 0) {
            throw { statusCode: 409, message: 'This bus has been removed from sale; it cannot accept restored bookings.' };
          }
          if (Number(buses[0].available_seats) < 1) {
            throw { statusCode: 409, message: 'There are no available seats to confirm this booking.' };
          }
          await conn.query('UPDATE buses SET available_seats = available_seats - 1 WHERE bus_id = ?', [booking.bus_id]);
        }
      }
      await conn.query(
        `UPDATE bookings SET passenger_name = ?, passenger_age = ?,
         passenger_gender = ?, seat_no = ?, fare = ?, status = ? WHERE booking_id = ?`,
        [passenger_name.trim(), age, passenger_gender, updatedSeat, updatedFare, status, bookingId]
      );
    });
    return res.json({ success: true, message: 'Booking details updated.' });
  } catch (error) {
    console.error('Admin update booking error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update booking.'
    });
  }
});

app.put('/api/admin/members/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const { name, email, phone } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!Number.isInteger(memberId) || memberId < 1 ||
        typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        !/^\d{10}$/.test(String(phone || '').replace(/[\s-]/g, ''))) {
      return res.status(400).json({ success: false, message: 'Enter a valid name, email, and 10-digit phone number.' });
    }
    const result = await db.query(
      "UPDATE passengers SET name = ?, email = ?, phone = ? WHERE passenger_id = ? AND role = 'MEMBER'",
      [name.trim(), normalizedEmail, String(phone).replace(/[\s-]/g, ''), memberId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    return res.json({ success: true, message: 'Member details updated.' });
  } catch (error) {
    console.error('Admin update member error:', error);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate ? 'That email address is already in use.' : 'Failed to update member.'
    });
  }
});

/**
 * GET /api/user/profile
 * Get logged-in user profile details
 */
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const users = await db.query(
      'SELECT passenger_id, name, email, phone, created_at FROM passengers WHERE passenger_id = ?',
      [req.session.user.passenger_id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      profile: users[0]
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

/**
 * PUT /api/user/profile
 * Update user contact details (name and phone)
 */
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    await db.query(
      'UPDATE passengers SET name = ?, phone = ? WHERE passenger_id = ?',
      [name.trim(), phone.trim(), req.session.user.passenger_id]
    );

    req.session.user.name = name.trim();
    req.session.user.phone = phone.trim();

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: req.session.user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/**
 * POST /api/user/change-password
 * Change password verifying current password
 */
app.post('/api/user/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.'
      });
    }

    // Retrieve current password hash
    const users = await db.query(
      'SELECT password_hash FROM passengers WHERE passenger_id = ?',
      [req.session.user.passenger_id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentHash = users[0].password_hash;

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, currentHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Please check and try again.'
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update in database
    await db.query(
      'UPDATE passengers SET password_hash = ? WHERE passenger_id = ?',
      [newHash, req.session.user.passenger_id]
    );

    return res.json({
      success: true,
      message: 'Your password has been changed successfully.'
    });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password. Please try again.' });
  }
});

// ============================================================================
// 2. BUS SEARCH & DETAILS APIS
// ============================================================================

/**
 * GET /api/buses/cities
 * Returns list of unique cities for search dropdowns
 */
app.get('/api/buses/cities', async (req, res) => {
  try {
    const rows = await db.query('SELECT DISTINCT source, destination FROM buses WHERE is_active = 1');
    const dbSources = rows.map(r => r.source).filter(Boolean);
    const dbDestinations = rows.map(r => r.destination).filter(Boolean);

    // Guaranteed comprehensive Andhra Pradesh & regional connected hubs list
    const apHubs = [
      'Kurnool', 'Nandyal', 'Vijayawada', 'Guntur', 'Visakhapatnam',
      'Tirupati', 'Kadapa', 'Anantapur', 'Nellore', 'Ongole',
      'Rajahmundry', 'Kakinada', 'Eluru', 'Srikakulam', 'Chittoor',
      'Amaravati', 'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai',
      'Pune', 'Goa', 'Shirdi'
    ];

    const sources = [...new Set([...apHubs, ...dbSources])].sort((a, b) => a.localeCompare(b));
    const destinations = [...new Set([...apHubs, ...dbDestinations])].sort((a, b) => a.localeCompare(b));

    return res.json({
      success: true,
      sources,
      destinations
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cities.' });
  }
});

/**
 * GET /api/buses/search
 * Search buses with source, destination, date, or get upcoming
 */
app.get('/api/buses/search', async (req, res) => {
  try {
    const { source, destination, date, busType } = req.query;

    let sql = 'SELECT * FROM buses WHERE is_active = 1';
    const params = [];

    if (source && source.trim() !== '') {
      sql += ' AND LOWER(source) = LOWER(?)';
      params.push(source.trim());
    }

    if (destination && destination.trim() !== '') {
      sql += ' AND LOWER(destination) = LOWER(?)';
      params.push(destination.trim());
    }

    if (date && date.trim() !== '') {
      sql += ' AND travel_date = ?';
      params.push(date.trim());
    } else {
      // By default show upcoming or today's buses
      sql += ' AND travel_date >= CURDATE()';
    }

    if (busType && busType.trim() !== 'All') {
      sql += ' AND bus_type LIKE ?';
      params.push(`%${busType.trim()}%`);
    }

    sql += ' ORDER BY travel_date ASC, departure_time ASC';

    const buses = await db.query(sql, params);

    return res.json({
      success: true,
      count: buses.length,
      buses
    });
  } catch (error) {
    console.error('Bus search error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search buses.' });
  }
});

/**
 * GET /api/buses/:id
 * Retrieve details of a specific bus
 */
app.get('/api/buses/:id', async (req, res) => {
  try {
    const busId = parseInt(req.params.id, 10);
    const buses = await db.query('SELECT * FROM buses WHERE bus_id = ? AND is_active = 1', [busId]);

    if (!buses || buses.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found.' });
    }

    return res.json({
      success: true,
      bus: buses[0]
    });
  } catch (error) {
    console.error('Bus details error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch bus details.' });
  }
});

/**
 * GET /api/buses/:id/seats
 * Get real-time seat configuration and booked seat status
 */
app.get('/api/buses/:id/seats', async (req, res) => {
  try {
    const busId = parseInt(req.params.id, 10);
    const buses = await db.query('SELECT * FROM buses WHERE bus_id = ? AND is_active = 1', [busId]);

    if (!buses || buses.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found.' });
    }

    const bus = buses[0];

    // Fetch active bookings for this bus
    const bookedRows = await db.query(
      "SELECT seat_no FROM bookings WHERE bus_id = ? AND status = 'CONFIRMED'",
      [busId]
    );

    const bookedSeatNumbers = new Set(bookedRows.map(r => String(r.seat_no)));

    // Generate 40-seat configuration (standard 2x2 layout with 10 rows or lower/upper deck)
    const seats = [];
    const totalSeats = bus.total_seats || 40;

    for (let i = 1; i <= totalSeats; i++) {
      const seatNo = String(i);
      const isBooked = bookedSeatNumbers.has(seatNo);

      // Label rows and columns for realistic layout
      const rowNum = Math.ceil(i / 4);
      const colPos = ((i - 1) % 4) + 1; // 1: Window Left, 2: Aisle Left, 3: Aisle Right, 4: Window Right

      seats.push({
        seat_no: seatNo,
        row: rowNum,
        col: colPos,
        is_booked: isBooked,
        is_window: colPos === 1 || colPos === 4,
        fare: bus.fare,
        type: bus.bus_type.includes('Sleeper') ? (i <= 20 ? 'Lower Berth' : 'Upper Berth') : 'Seater'
      });
    }

    return res.json({
      success: true,
      bus,
      total_seats: totalSeats,
      booked_count: bookedSeatNumbers.size,
      available_count: Math.max(0, totalSeats - bookedSeatNumbers.size),
      seats
    });
  } catch (error) {
    console.error('Seat map error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load seat layout.' });
  }
});

// ============================================================================
// 3. BOOKING CREATION & TRANSACTION MANAGEMENT
// ============================================================================

/**
 * POST /api/bookings
 * Create booking with seat concurrency protection and transaction safety
 */
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { bus_id, passengers } = req.body;
    const passengerId = req.session.user.passenger_id;

    if (!bus_id || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking request. At least one seat and passenger required.'
      });
    }

    const busId = parseInt(bus_id, 10);
    const seatNumbers = passengers.map(p => String(p.seat_no));

    // Check for duplicate seats within the same request
    const uniqueSeats = new Set(seatNumbers);
    if (uniqueSeats.size !== seatNumbers.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate seat numbers detected in the booking request.'
      });
    }

    // Execute atomic booking transaction
    const bookingResult = await db.executeTransaction(async (conn) => {
      // 1. Lock bus record
      const [busRows] = await conn.query('SELECT * FROM buses WHERE bus_id = ?', [busId]);
      if (!busRows || busRows.length === 0 || Number(busRows[0].is_active) === 0) {
        throw { statusCode: 404, message: 'Selected bus not found.' };
      }
      const bus = busRows[0];

      // 2. Concurrency Check: Check if any requested seat is already booked with CONFIRMED status
      const placeholders = seatNumbers.map(() => '?').join(',');
      const [conflicts] = await conn.query(
        `SELECT seat_no FROM bookings WHERE bus_id = ? AND seat_no IN (${placeholders}) AND status = 'CONFIRMED'`,
        [busId, ...seatNumbers]
      );

      if (conflicts && conflicts.length > 0) {
        const taken = conflicts.map(c => c.seat_no).join(', ');
        throw {
          statusCode: 409,
          message: `Seat ${taken} has just been reserved by another passenger. Please select another seat.`
        };
      }

      // Check available seats count
      if (bus.available_seats < seatNumbers.length) {
        throw {
          statusCode: 409,
          message: `Only ${bus.available_seats} seats remaining on this bus.`
        };
      }

      // 3. Generate unique booking reference (e.g. SBR-202610-A8B9C)
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const bookingRef = `SBR-${datePart}-${randomSuffix}`;

      const totalFare = bus.fare * passengers.length;

      // 4. Insert each seat booking
      for (const p of passengers) {
        await conn.query(
          `INSERT INTO bookings 
           (booking_ref, passenger_id, bus_id, seat_no, passenger_name, passenger_age, passenger_gender, fare, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
          [
            bookingRef,
            passengerId,
            busId,
            String(p.seat_no),
            (p.name || req.session.user.name).trim(),
            parseInt(p.age || 25, 10),
            p.gender || 'Male',
            bus.fare
          ]
        );
      }

      // 5. Decrement available seats count on the bus safely
      await conn.query(
        'UPDATE buses SET available_seats = available_seats - ? WHERE bus_id = ?',
        [passengers.length, busId]
      );

      return {
        bookingRef,
        bus,
        seatNumbers,
        totalFare,
        passengerCount: passengers.length
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: bookingResult
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to complete booking. Please try again.'
    });
  }
});

/**
 * GET /api/bookings/my-bookings
 * Get all booking history for authenticated user
 */
app.get('/api/bookings/my-bookings', requireAuth, async (req, res) => {
  try {
    const passengerId = req.session.user.passenger_id;

    const rows = await db.query(
      `SELECT bk.booking_id, bk.booking_ref, bk.booking_date, bk.seat_no, 
              bk.passenger_name, bk.passenger_age, bk.passenger_gender, bk.fare, bk.status,
              b.bus_id, b.bus_no, b.bus_name, b.source, b.destination, 
              b.departure_time, b.arrival_time, b.duration, b.bus_type, b.travel_date
       FROM bookings bk
       JOIN buses b ON bk.bus_id = b.bus_id
       WHERE bk.passenger_id = ?
       ORDER BY bk.booking_date DESC, bk.booking_id DESC`,
      [passengerId]
    );

    // Group bookings by booking_ref
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.booking_ref]) {
        grouped[r.booking_ref] = {
          booking_ref: r.booking_ref,
          bus_id: r.bus_id,
          bus_no: r.bus_no,
          bus_name: r.bus_name,
          source: r.source,
          destination: r.destination,
          departure_time: r.departure_time,
          arrival_time: r.arrival_time,
          duration: r.duration,
          bus_type: r.bus_type,
          travel_date: r.travel_date,
          booking_date: r.booking_date,
          status: r.status,
          seats: [],
          total_fare: 0
        };
      }
      grouped[r.booking_ref].seats.push({
        seat_no: r.seat_no,
        passenger_name: r.passenger_name,
        passenger_age: r.passenger_age,
        passenger_gender: r.passenger_gender,
        fare: parseFloat(r.fare)
      });
      grouped[r.booking_ref].total_fare += parseFloat(r.fare);

      // If any seat is CONFIRMED, mark overall status as CONFIRMED
      if (r.status === 'CONFIRMED') {
        grouped[r.booking_ref].status = 'CONFIRMED';
      }
    }

    const bookingsList = Object.values(grouped);

    return res.json({
      success: true,
      count: bookingsList.length,
      bookings: bookingsList
    });
  } catch (error) {
    console.error('My bookings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve booking history.' });
  }
});

/**
 * GET /api/bookings/ticket/:ref
 * Fetch full ticket details for printable ticket / confirmation
 */
app.get('/api/bookings/ticket/:ref', requireAuth, async (req, res) => {
  try {
    const bookingRef = req.params.ref.trim();
    const passengerId = req.session.user.passenger_id;

    const rows = await db.query(
      `SELECT bk.*, b.bus_no, b.bus_name, b.source, b.destination, 
              b.departure_time, b.arrival_time, b.duration, b.bus_type, b.travel_date,
              p.name as primary_contact_name, p.email as primary_contact_email, p.phone as primary_contact_phone
       FROM bookings bk
       JOIN buses b ON bk.bus_id = b.bus_id
       JOIN passengers p ON bk.passenger_id = p.passenger_id
       WHERE bk.booking_ref = ? AND bk.passenger_id = ?`,
      [bookingRef, passengerId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized.' });
    }

    const first = rows[0];
    const ticket = {
      booking_ref: first.booking_ref,
      booking_date: first.booking_date,
      status: first.status,
      bus_id: first.bus_id,
      bus_no: first.bus_no,
      bus_name: first.bus_name,
      source: first.source,
      destination: first.destination,
      departure_time: first.departure_time,
      arrival_time: first.arrival_time,
      duration: first.duration,
      bus_type: first.bus_type,
      travel_date: first.travel_date,
      primary_contact: {
        name: first.primary_contact_name,
        email: first.primary_contact_email,
        phone: first.primary_contact_phone
      },
      passengers: rows.map(r => ({
        seat_no: r.seat_no,
        name: r.passenger_name,
        age: r.passenger_age,
        gender: r.passenger_gender,
        fare: parseFloat(r.fare)
      })),
      total_fare: rows.reduce((sum, r) => sum + parseFloat(r.fare), 0)
    };

    return res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Ticket detail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve ticket details.' });
  }
});

/**
 * POST /api/bookings/:ref/cancel
 * Cancel an active booking and restore bus seat capacity
 */
app.post('/api/bookings/:ref/cancel', requireAuth, async (req, res) => {
  try {
    const bookingRef = req.params.ref.trim();
    const passengerId = req.session.user.passenger_id;

    const result = await db.executeTransaction(async (conn) => {
      // 1. Find active confirmed seats for this booking and user
      const [seats] = await conn.query(
        "SELECT * FROM bookings WHERE booking_ref = ? AND passenger_id = ? AND status = 'CONFIRMED'",
        [bookingRef, passengerId]
      );

      if (!seats || seats.length === 0) {
        throw { statusCode: 400, message: 'No active confirmed seats found for cancellation.' };
      }

      const busId = seats[0].bus_id;
      const seatCount = seats.length;

      // 2. Mark booking records as CANCELLED
      await conn.query(
        "UPDATE bookings SET status = 'CANCELLED' WHERE booking_ref = ? AND passenger_id = ?",
        [bookingRef, passengerId]
      );

      // 3. Safely restore available seats on the bus
      await conn.query(
        'UPDATE buses SET available_seats = available_seats + ? WHERE bus_id = ?',
        [seatCount, busId]
      );

      return {
        cancelledRef: bookingRef,
        seatsReleased: seatCount
      };
    });

    return res.json({
      success: true,
      message: `Booking ${bookingRef} has been successfully cancelled. ${result.seatsReleased} seat(s) released.`,
      result
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to cancel booking.'
    });
  }
});

// Fallback route handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚌 Sainath Bus Reservation System Server running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
  console.log(`=======================================================`);
});
