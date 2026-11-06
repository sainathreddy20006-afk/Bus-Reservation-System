/**
 * Sainath Bus Reservation System
 * Database Connection & Query Manager
 * Uses mysql2/promise with connection pooling and graceful initialization
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sainath_bus_reservation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

let pool = null;
let isConnected = false;

// In-memory fallback dataset for seamless initial testing before MySQL credentials are provided
let mockState = null;

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function initMockData() {
  const passwordHash = bcrypt.hashSync('Test@123', 10);
  
  const passengers = [
    {
      passenger_id: 1,
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '9876543210',
      password_hash: passwordHash,
      role: 'MEMBER',
      created_at: new Date().toISOString()
    }
  ];

  const busTemplates = [
    { no: 'SN-101', name: 'Sainath Super Luxury AC Sleeper', src: 'Mumbai', dst: 'Shirdi', dep: '06:00:00', arr: '12:30:00', dur: '6h 30m', fare: 750, type: 'AC Sleeper (2+1)' },
    { no: 'SN-102', name: 'Sainath Royal Volvo Multi-Axle', src: 'Mumbai', dst: 'Shirdi', dep: '14:30:00', arr: '20:45:00', dur: '6h 15m', fare: 850, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-103', name: 'Sainath Night Rider Express', src: 'Mumbai', dst: 'Shirdi', dep: '22:00:00', arr: '04:30:00', dur: '6h 30m', fare: 650, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-104', name: 'Sainath Pilgrimage Star', src: 'Shirdi', dst: 'Mumbai', dep: '07:30:00', arr: '14:00:00', dur: '6h 30m', fare: 750, type: 'AC Sleeper (2+1)' },
    { no: 'SN-105', name: 'Sainath Evening Return', src: 'Shirdi', dst: 'Mumbai', dep: '21:30:00', arr: '04:00:00', dur: '6h 30m', fare: 650, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-201', name: 'Sainath Shirdi Express', src: 'Pune', dst: 'Shirdi', dep: '05:30:00', arr: '10:30:00', dur: '5h 00m', fare: 550, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-202', name: 'Sainath Divine Tour Sleeper', src: 'Pune', dst: 'Shirdi', dep: '23:00:00', arr: '04:15:00', dur: '5h 15m', fare: 700, type: 'AC Sleeper (2+1)' },
    { no: 'SN-203', name: 'Sainath Shirdi Return Express', src: 'Shirdi', dst: 'Pune', dep: '13:00:00', arr: '18:15:00', dur: '5h 15m', fare: 550, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-301', name: 'Sainath Expressway Shuttle', src: 'Mumbai', dst: 'Pune', dep: '07:00:00', arr: '10:30:00', dur: '3h 30m', fare: 400, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-302', name: 'Sainath Intercity Comfort', src: 'Mumbai', dst: 'Pune', dep: '17:00:00', arr: '20:30:00', dur: '3h 30m', fare: 450, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-303', name: 'Sainath Metro Connect', src: 'Pune', dst: 'Mumbai', dep: '08:00:00', arr: '11:30:00', dur: '3h 30m', fare: 400, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-401', name: 'Sainath Coastal Queen Sleeper', src: 'Pune', dst: 'Goa', dep: '20:00:00', arr: '06:30:00', dur: '10h 30m', fare: 1100, type: 'AC Sleeper (2+1)' },
    { no: 'SN-402', name: 'Sainath Sunset Cruiser', src: 'Pune', dst: 'Goa', dep: '21:30:00', arr: '08:00:00', dur: '10h 30m', fare: 950, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-501', name: 'Sainath Tech Corridor Volvo', src: 'Hyderabad', dst: 'Bangalore', dep: '21:00:00', arr: '06:00:00', dur: '9h 00m', fare: 1200, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-502', name: 'Sainath Deccan Express', src: 'Hyderabad', dst: 'Bangalore', dep: '22:30:00', arr: '07:30:00', dur: '9h 00m', fare: 1050, type: 'AC Sleeper (2+1)' },
    { no: 'SN-601', name: 'Sainath Godavari Fast', src: 'Nashik', dst: 'Pune', dep: '06:30:00', arr: '11:00:00', dur: '4h 30m', fare: 450, type: 'Non-AC Seater (2+2)' },
    { no: 'SN-602', name: 'Sainath Nashik Highway Star', src: 'Nashik', dst: 'Mumbai', dep: '15:00:00', arr: '19:30:00', dur: '4h 30m', fare: 480, type: 'AC Semi-Sleeper (2+2)' },

    // Andhra Pradesh Core Hub Routes (Kurnool, Nandyal, Vijayawada, Guntur, Vizag, Tirupati, Kadapa, Anantapur)
    { no: 'SN-AP-101', name: 'Sainath Royal Volvo Multi-Axle', src: 'Kurnool', dst: 'Hyderabad', dep: '06:00:00', arr: '09:45:00', dur: '3h 45m', fare: 450, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-102', name: 'Sainath Tungabhadra Express', src: 'Kurnool', dst: 'Hyderabad', dep: '14:30:00', arr: '18:15:00', dur: '3h 45m', fare: 380, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-103', name: 'Sainath Rayalaseema Sleeper', src: 'Kurnool', dst: 'Hyderabad', dep: '23:15:00', arr: '03:30:00', dur: '4h 15m', fare: 550, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-104', name: 'Sainath Day Rider Seater', src: 'Kurnool', dst: 'Hyderabad', dep: '08:30:00', arr: '12:30:00', dur: '4h 00m', fare: 300, type: 'Non-AC Seater (2+2)' },
    { no: 'SN-AP-105', name: 'Sainath Tungabhadra Return', src: 'Hyderabad', dst: 'Kurnool', dep: '07:00:00', arr: '10:45:00', dur: '3h 45m', fare: 450, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-106', name: 'Sainath Night Express', src: 'Hyderabad', dst: 'Kurnool', dep: '22:30:00', arr: '02:30:00', dur: '4h 00m', fare: 550, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-201', name: 'Sainath Silicon Corridor Volvo', src: 'Kurnool', dst: 'Bengaluru', dep: '07:00:00', arr: '13:00:00', dur: '6h 00m', fare: 750, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-202', name: 'Sainath Bengaluru Night Sleeper', src: 'Kurnool', dst: 'Bengaluru', dep: '22:30:00', arr: '05:00:00', dur: '6h 30m', fare: 850, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-203', name: 'Sainath Deccan Semi-Sleeper', src: 'Kurnool', dst: 'Bengaluru', dep: '15:00:00', arr: '21:15:00', dur: '6h 15m', fare: 650, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-204', name: 'Sainath Bengaluru Return Volvo', src: 'Bengaluru', dst: 'Kurnool', dep: '21:45:00', arr: '04:15:00', dur: '6h 30m', fare: 750, type: 'Volvo Multi-Axle AC' },

    { no: 'SN-AP-301', name: 'Sainath Amaravati Highway Express', src: 'Kurnool', dst: 'Vijayawada', dep: '06:30:00', arr: '13:30:00', dur: '7h 00m', fare: 600, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-302', name: 'Sainath Krishna River Sleeper', src: 'Kurnool', dst: 'Vijayawada', dep: '21:30:00', arr: '04:45:00', dur: '7h 15m', fare: 750, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-303', name: 'Sainath Amaravati Return', src: 'Vijayawada', dst: 'Kurnool', dep: '22:00:00', arr: '05:00:00', dur: '7h 00m', fare: 750, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-401', name: 'Sainath Balaji Pilgrimage Express', src: 'Kurnool', dst: 'Tirupati', dep: '06:00:00', arr: '13:00:00', dur: '7h 00m', fare: 580, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-402', name: 'Sainath Seven Hills Sleeper', src: 'Kurnool', dst: 'Tirupati', dep: '22:00:00', arr: '05:15:00', dur: '7h 15m', fare: 720, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-403', name: 'Sainath Balaji Return', src: 'Tirupati', dst: 'Kurnool', dep: '21:30:00', arr: '04:45:00', dur: '7h 15m', fare: 720, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-501', name: 'Sainath Rayalaseema Shuttle', src: 'Kurnool', dst: 'Nandyal', dep: '07:30:00', arr: '09:00:00', dur: '1h 30m', fare: 150, type: 'Non-AC Seater (2+2)' },
    { no: 'SN-AP-502', name: 'Sainath Mahanandi Express', src: 'Kurnool', dst: 'Nandyal', dep: '17:30:00', arr: '19:00:00', dur: '1h 30m', fare: 180, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-503', name: 'Sainath Nandyal-Bengaluru Sleeper', src: 'Nandyal', dst: 'Bengaluru', dep: '21:00:00', arr: '05:30:00', dur: '8h 30m', fare: 800, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-601', name: 'Sainath Coastal Queen Multi-Axle', src: 'Vijayawada', dst: 'Visakhapatnam', dep: '06:00:00', arr: '12:00:00', dur: '6h 00m', fare: 700, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-602', name: 'Sainath Vizag City Sleeper', src: 'Vijayawada', dst: 'Visakhapatnam', dep: '23:00:00', arr: '05:30:00', dur: '6h 30m', fare: 850, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-603', name: 'Sainath Vizag Coastal Return', src: 'Visakhapatnam', dst: 'Vijayawada', dep: '07:30:00', arr: '13:30:00', dur: '6h 00m', fare: 700, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-604', name: 'Sainath Vizag Night Express', src: 'Visakhapatnam', dst: 'Vijayawada', dep: '22:30:00', arr: '05:00:00', dur: '6h 30m', fare: 850, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-701', name: 'Sainath Mirchi Express Multi-Axle', src: 'Guntur', dst: 'Hyderabad', dep: '06:30:00', arr: '12:00:00', dur: '5h 30m', fare: 550, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-702', name: 'Sainath Amaravati Capitals Sleeper', src: 'Guntur', dst: 'Hyderabad', dep: '22:30:00', arr: '04:30:00', dur: '6h 00m', fare: 680, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-801', name: 'Sainath Metro Connect Volvo', src: 'Tirupati', dst: 'Chennai', dep: '07:00:00', arr: '10:30:00', dur: '3h 30m', fare: 420, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-802', name: 'Sainath Pilgrim Highway Star', src: 'Tirupati', dst: 'Chennai', dep: '16:00:00', arr: '19:45:00', dur: '3h 45m', fare: 380, type: 'AC Semi-Sleeper (2+2)' },

    { no: 'SN-AP-901', name: 'Sainath Penna Valley Express', src: 'Kadapa', dst: 'Hyderabad', dep: '21:00:00', arr: '05:00:00', dur: '8h 00m', fare: 750, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-902', name: 'Sainath Airport Corridor Volvo', src: 'Anantapur', dst: 'Bengaluru', dep: '06:00:00', arr: '09:30:00', dur: '3h 30m', fare: 450, type: 'Volvo Multi-Axle AC' },
    { no: 'SN-AP-903', name: 'Sainath Highway Star Sleeper', src: 'Anantapur', dst: 'Bengaluru', dep: '23:30:00', arr: '03:15:00', dur: '3h 45m', fare: 550, type: 'AC Sleeper (2+1)' },

    { no: 'SN-AP-904', name: 'Sainath Coastal Express', src: 'Nellore', dst: 'Chennai', dep: '07:00:00', arr: '10:45:00', dur: '3h 45m', fare: 350, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-905', name: 'Sainath Godavari Gateway', src: 'Rajahmundry', dst: 'Vijayawada', dep: '06:30:00', arr: '09:45:00', dur: '3h 15m', fare: 320, type: 'AC Semi-Sleeper (2+2)' },
    { no: 'SN-AP-906', name: 'Sainath Western Ghats Holiday Sleeper', src: 'Kurnool', dst: 'Goa', dep: '18:00:00', arr: '07:30:00', dur: '13h 30m', fare: 1250, type: 'AC Sleeper (2+1)' },
    { no: 'SN-AP-907', name: 'Sainath Divya Darshan Superfast', src: 'Tirupati', dst: 'Shirdi', dep: '14:00:00', arr: '08:30:00', dur: '18h 30m', fare: 1600, type: 'AC Sleeper (2+1)' }
  ];

  const buses = [];
  let busIdCounter = 1;

  // Generate buses for today and the next 14 days
  for (let day = 0; day <= 14; day++) {
    const travelDate = getTodayString(day);
    for (const t of busTemplates) {
      buses.push({
        bus_id: busIdCounter++,
        bus_no: `${t.no}${day > 0 ? '-' + day : ''}`,
        bus_name: t.name,
        source: t.src,
        destination: t.dst,
        departure_time: t.dep,
        arrival_time: t.arr,
        duration: t.dur,
        total_seats: 40,
        available_seats: 38,
        fare: t.fare,
        bus_type: t.type,
        travel_date: travelDate,
        is_active: 1,
        created_at: new Date().toISOString()
      });
    }
  }

  // Pre-seed a sample confirmed booking
  const bookings = [
    {
      booking_id: 1,
      booking_ref: 'SBR-INIT-001',
      passenger_id: 1,
      bus_id: 1,
      booking_date: new Date().toISOString(),
      seat_no: '12',
      passenger_name: 'Rahul Sharma',
      passenger_age: 28,
      passenger_gender: 'Male',
      fare: 750.00,
      status: 'CONFIRMED'
    },
    {
      booking_id: 2,
      booking_ref: 'SBR-INIT-001',
      passenger_id: 1,
      bus_id: 1,
      booking_date: new Date().toISOString(),
      seat_no: '13',
      passenger_name: 'Priya Sharma',
      passenger_age: 26,
      passenger_gender: 'Female',
      fare: 750.00,
      status: 'CONFIRMED'
    }
  ];

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    passengers.push({
      passenger_id: 2,
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      phone: process.env.ADMIN_PHONE || '0000000000',
      password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10),
      role: 'ADMIN',
      created_at: new Date().toISOString()
    });
  }

  return {
    passengers,
    buses,
    bookings,
    passengerIdSeq: passengers.length + 1,
    bookingIdSeq: 3
  };
}

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnected = true;
    console.log(`[Database] Connected successfully to MySQL database "${dbConfig.database}" on ${dbConfig.host}:${dbConfig.port}`);
  } catch (err) {
    isConnected = false;
    console.warn(`[Database] MySQL connection note: ${err.message}`);
    console.warn('[Database] Running in synchronized local memory mode until MySQL credentials are configured in .env and schema.sql is imported.');
    mockState = initMockData();
  }
}

/**
 * Execute parameterized query
 */
async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('[Database Query Error]', err.message, 'SQL:', sql);
      throw err;
    }
  }

  // In-Memory Query Router for fallback
  return runMockQuery(sql, params);
}

/**
 * Execute a transaction block
 */
async function executeTransaction(callback) {
  if (isConnected && pool) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Fallback transactional callback
  return callback({
    query: async (sql, params) => {
      const result = runMockQuery(sql, params);
      return [result];
    }
  });
}

function runMockQuery(sql, params) {
  const norm = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT user by email
  if (norm.startsWith('SELECT * FROM passengers WHERE email = ?')) {
    const user = mockState.passengers.find(p => p.email.toLowerCase() === (params[0] || '').toLowerCase());
    return user ? [user] : [];
  }

  // 2. SELECT passenger by ID
  if (norm.includes('FROM passengers WHERE passenger_id = ?')) {
    const user = mockState.passengers.find(p => p.passenger_id === Number(params[0]));
    return user ? [user] : [];
  }

  // 3. INSERT passenger
  if (norm.startsWith('INSERT INTO passengers')) {
    const newPassenger = {
      passenger_id: mockState.passengerIdSeq++,
      name: params[0],
      email: params[1],
      phone: params[2],
      password_hash: params[3],
      role: 'MEMBER',
      created_at: new Date().toISOString()
    };
    mockState.passengers.push(newPassenger);
    return { insertId: newPassenger.passenger_id, affectedRows: 1 };
  }

  // 4. UPDATE passenger password
  if (norm.startsWith('UPDATE passengers SET password_hash = ? WHERE passenger_id = ?')) {
    const p = mockState.passengers.find(x => x.passenger_id === Number(params[1]));
    if (p) {
      p.password_hash = params[0];
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 5. UPDATE passenger profile
  if (norm.startsWith('UPDATE passengers SET name = ?, phone = ? WHERE passenger_id = ?')) {
    const p = mockState.passengers.find(x => x.passenger_id === Number(params[2]));
    if (p) {
      p.name = params[0];
      p.phone = params[1];
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith("UPDATE passengers SET name = ?, email = ?, phone = ? WHERE passenger_id = ? AND role = 'MEMBER'")) {
    const p = mockState.passengers.find(x => x.passenger_id === Number(params[3]) && x.role === 'MEMBER');
    if (!p) return { affectedRows: 0 };
    p.name = params[0];
    p.email = params[1];
    p.phone = params[2];
    return { affectedRows: 1 };
  }

  if (norm.includes('COUNT(*) AS total_members FROM passengers')) {
    return [{
      total_members: mockState.passengers.filter(p => p.role === 'MEMBER').length
    }];
  }

  if (norm.includes('COUNT(DISTINCT bk.passenger_id) AS booked_members')) {
    const memberIds = new Set(
      mockState.bookings
        .filter(b => b.status === 'CONFIRMED')
        .filter(b => {
          const passenger = mockState.passengers.find(p => p.passenger_id === b.passenger_id);
          return passenger && passenger.role === 'MEMBER';
        })
        .map(b => b.passenger_id)
    );
    const confirmedSeats = mockState.bookings.filter(b => {
      const passenger = mockState.passengers.find(p => p.passenger_id === b.passenger_id);
      return b.status === 'CONFIRMED' && passenger && passenger.role === 'MEMBER';
    }).length;
    return [{ booked_members: memberIds.size, confirmed_seats: confirmedSeats }];
  }

  if (norm.includes('COUNT(*) AS total_buses FROM buses')) {
    return [{ total_buses: mockState.buses.filter(bus => bus.is_active !== 0).length }];
  }

  if (norm.includes('COUNT(DISTINCT CASE WHEN bk.status = \'CONFIRMED\' THEN bk.booking_ref END) AS booking_count')) {
    return mockState.passengers
      .filter(passenger => passenger.role === 'MEMBER')
      .map(passenger => {
        const bookings = mockState.bookings.filter(b => b.passenger_id === passenger.passenger_id);
        return {
          ...passenger,
          password_hash: undefined,
          booking_count: new Set(bookings.filter(b => b.status === 'CONFIRMED').map(b => b.booking_ref)).size,
          confirmed_seats: bookings.filter(b => b.status === 'CONFIRMED').length
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (norm.includes('FROM bookings bk') && norm.includes('p.role = \'MEMBER\'') &&
      norm.includes('bk.booking_id') && norm.includes('b.bus_id')) {
    return mockState.bookings
      .map(booking => {
        const passenger = mockState.passengers.find(p => p.passenger_id === booking.passenger_id);
        const bus = mockState.buses.find(b => b.bus_id === booking.bus_id);
        if (!passenger || passenger.role !== 'MEMBER' || !bus) return null;
        return {
          ...booking,
          passenger_id: passenger.passenger_id,
          member_name: passenger.name,
          member_email: passenger.email,
          member_phone: passenger.phone,
          bus_no: bus.bus_no,
          bus_name: bus.bus_name,
          source: bus.source,
          destination: bus.destination,
          departure_time: bus.departure_time,
          arrival_time: bus.arrival_time,
          duration: bus.duration,
          bus_type: bus.bus_type,
          travel_date: bus.travel_date
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date) || b.booking_id - a.booking_id);
  }

  if (norm.includes('SELECT * FROM buses ORDER BY travel_date DESC')) {
    return [...mockState.buses]
      .sort((a, b) => String(b.travel_date).localeCompare(String(a.travel_date)) ||
        a.departure_time.localeCompare(b.departure_time));
  }

  if (norm.startsWith('INSERT INTO buses')) {
    const bus = {
      bus_id: Math.max(0, ...mockState.buses.map(b => b.bus_id)) + 1,
      bus_no: params[0],
      bus_name: params[1],
      source: params[2],
      destination: params[3],
      departure_time: params[4],
      arrival_time: params[5],
      duration: params[6],
      total_seats: Number(params[7]),
      available_seats: Number(params[8]),
      fare: Number(params[9]),
      bus_type: params[10],
      travel_date: params[11],
      is_active: 1,
      created_at: new Date().toISOString()
    };
    mockState.buses.push(bus);
    return { insertId: bus.bus_id, affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE buses SET bus_no = ?, bus_name = ?')) {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[13]));
    if (!bus) return { affectedRows: 0 };
    Object.assign(bus, {
      bus_no: params[0],
      bus_name: params[1],
      source: params[2],
      destination: params[3],
      departure_time: params[4],
      arrival_time: params[5],
      duration: params[6],
      total_seats: Number(params[7]),
      available_seats: Number(params[8]),
      fare: Number(params[9]),
      bus_type: params[10],
      travel_date: params[11],
      is_active: Number(params[12])
    });
    return { affectedRows: 1 };
  }

  if (norm === 'UPDATE buses SET is_active = 0 WHERE bus_id = ?' ||
      norm === 'UPDATE buses SET is_active = 1 WHERE bus_id = ?') {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[0]));
    if (!bus) return { affectedRows: 0 };
    bus.is_active = norm.includes('= 1') ? 1 : 0;
    return { affectedRows: 1 };
  }

  if (norm.startsWith('SELECT bk.*, b.total_seats FROM bookings bk') && norm.includes('bk.booking_id = ?')) {
    const booking = mockState.bookings.find(b => b.booking_id === Number(params[0]));
    if (!booking) return [];
    const bus = mockState.buses.find(b => b.bus_id === booking.bus_id);
    return bus ? [{ ...booking, total_seats: bus.total_seats }] : [];
  }

  if (norm.startsWith('SELECT booking_id FROM bookings WHERE bus_id = ? AND seat_no = ?')) {
    return mockState.bookings.filter(b => b.bus_id === Number(params[0]) &&
      b.seat_no === String(params[1]) && b.status === 'CONFIRMED' &&
      b.booking_id !== Number(params[2]));
  }

  if (norm.startsWith('UPDATE bookings SET passenger_name = ?, passenger_age = ?')) {
    const booking = mockState.bookings.find(b => b.booking_id === Number(params[6]));
    if (!booking) return { affectedRows: 0 };
    Object.assign(booking, {
      passenger_name: params[0],
      passenger_age: Number(params[1]),
      passenger_gender: params[2],
      seat_no: String(params[3]),
      fare: Number(params[4]),
      status: params[5]
    });
    return { affectedRows: 1 };
  }

  if (norm.includes('FROM bookings WHERE bus_id = ? AND status = \'CONFIRMED\'') &&
      norm.startsWith('SELECT booking_id')) {
    return mockState.bookings.filter(b => b.bus_id === Number(params[0]) && b.status === 'CONFIRMED');
  }

  if (norm.startsWith('SELECT available_seats, is_active FROM buses WHERE bus_id = ?')) {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[0]));
    return bus ? [{ available_seats: bus.available_seats, is_active: bus.is_active }] : [];
  }

  if (norm.includes('FROM bookings bk') && norm.includes('p.role = \'MEMBER\'') &&
      norm.includes('GROUP BY bk.booking_ref')) {
    const groupedBookings = new Map();
    for (const booking of mockState.bookings) {
      if (booking.status !== 'CONFIRMED') continue;
      const passenger = mockState.passengers.find(p => p.passenger_id === booking.passenger_id);
      const bus = mockState.buses.find(b => b.bus_id === booking.bus_id);
      if (!passenger || passenger.role !== 'MEMBER' || !bus) continue;

      let summary = groupedBookings.get(booking.booking_ref);
      if (!summary) {
        summary = {
          booking_ref: booking.booking_ref,
          booking_date: booking.booking_date,
          member_name: passenger.name,
          member_email: passenger.email,
          bus_no: bus.bus_no,
          bus_name: bus.bus_name,
          source: bus.source,
          destination: bus.destination,
          travel_date: bus.travel_date,
          seat_count: 0,
          total_fare: 0
        };
        groupedBookings.set(booking.booking_ref, summary);
      }
      summary.seat_count += 1;
      summary.total_fare += Number(booking.fare);
      if (new Date(booking.booking_date) > new Date(summary.booking_date)) {
        summary.booking_date = booking.booking_date;
      }
    }
    return [...groupedBookings.values()]
      .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
      .slice(0, 20);
  }

  // 6. Cities list
  if (norm.includes('SELECT DISTINCT source') || norm.includes('SELECT DISTINCT destination')) {
    return mockState.buses.filter(b => b.is_active !== 0)
      .map(b => ({ source: b.source, destination: b.destination }));
  }

  // 7. Search buses
  if (norm.includes('FROM buses WHERE 1=1') || norm.startsWith('SELECT * FROM buses WHERE is_active = 1') ||
      norm.startsWith('SELECT DISTINCT source') ||
      norm.startsWith('SELECT DISTINCT destination')) {
    let list = [...mockState.buses];
    let paramIndex = 0;

    if (norm.includes('is_active = 1')) {
      list = list.filter(b => b.is_active !== 0);
    }

    if (norm.includes('source = ?') || norm.includes('LOWER(source) = LOWER(?)')) {
      const source = String(params[paramIndex++] || '');
      if (source) {
        list = list.filter(b => b.source.toLowerCase() === source.toLowerCase());
      }
    }
    if (norm.includes('destination = ?') || norm.includes('LOWER(destination) = LOWER(?)')) {
      const destination = String(params[paramIndex++] || '');
      if (destination) {
        list = list.filter(b => b.destination.toLowerCase() === destination.toLowerCase());
      }
    }
    if (norm.includes('travel_date = ?')) {
      const dateVal = String(params[paramIndex++] || '');
      if (dateVal) {
        list = list.filter(b => b.travel_date === dateVal);
      }
    } else if (norm.includes('travel_date >= CURDATE()')) {
      list = list.filter(b => b.travel_date >= getTodayString());
    }

    if (norm.includes('bus_type LIKE ?')) {
      const busType = String(params[paramIndex] || '').replace(/%/g, '').toLowerCase();
      if (busType) list = list.filter(b => b.bus_type.toLowerCase().includes(busType));
    }

    if (norm.includes('ORDER BY departure_time ASC')) {
      list.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    }
    return list;
  }

  // 8. SELECT single bus
  if (norm.startsWith('SELECT * FROM buses WHERE bus_id = ?')) {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[0]));
    return bus && (!norm.includes('is_active = 1') || bus.is_active !== 0) ? [bus] : [];
  }

  // 9. Booked seats for a bus
  if (norm.includes('FROM bookings WHERE bus_id = ? AND status = \'CONFIRMED\'') ||
      norm.includes('FROM bookings WHERE bus_id = ? AND status = ?')) {
    const busId = Number(params[0]);
    return mockState.bookings.filter(b => b.bus_id === busId && b.status === 'CONFIRMED');
  }

  // 10. Check specific seats for booking
  if (norm.includes('FROM bookings WHERE bus_id = ? AND seat_no IN') && norm.includes('status = \'CONFIRMED\'')) {
    const busId = Number(params[0]);
    const seatList = params.slice(1);
    return mockState.bookings.filter(b => b.bus_id === busId && seatList.includes(b.seat_no) && b.status === 'CONFIRMED');
  }

  // 11. INSERT booking
  if (norm.startsWith('INSERT INTO bookings')) {
    const newBooking = {
      booking_id: mockState.bookingIdSeq++,
      booking_ref: params[0],
      passenger_id: Number(params[1]),
      bus_id: Number(params[2]),
      booking_date: new Date().toISOString(),
      seat_no: String(params[3]),
      passenger_name: params[4],
      passenger_age: Number(params[5]),
      passenger_gender: params[6],
      fare: parseFloat(params[7]),
      status: 'CONFIRMED'
    };
    mockState.bookings.push(newBooking);
    return { insertId: newBooking.booking_id, affectedRows: 1 };
  }

  // 12. UPDATE buses available seats
  if (norm === 'UPDATE buses SET available_seats = available_seats - 1 WHERE bus_id = ?' ||
      norm === 'UPDATE buses SET available_seats = available_seats + 1 WHERE bus_id = ?') {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[0]));
    if (!bus) return { affectedRows: 0 };
    const delta = norm.includes('- 1') ? -1 : 1;
    bus.available_seats = Math.max(0, Math.min(bus.total_seats, bus.available_seats + delta));
    return { affectedRows: 1 };
  }

  if (norm.includes('UPDATE buses SET available_seats = available_seats - ? WHERE bus_id = ?')) {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[1]));
    if (bus) {
      bus.available_seats = Math.max(0, bus.available_seats - Number(params[0]));
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.includes('UPDATE buses SET available_seats = available_seats + ? WHERE bus_id = ?')) {
    const bus = mockState.buses.find(b => b.bus_id === Number(params[1]));
    if (bus) {
      bus.available_seats = Math.min(bus.total_seats, bus.available_seats + Number(params[0]));
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 13. Single booking reference ticket details
  if (norm.includes('FROM bookings bk') && norm.includes('bk.booking_ref = ?')) {
    const ref = params[0];
    const pid = params[1] ? Number(params[1]) : null;
    const userBookings = mockState.bookings.filter(b => b.booking_ref === ref && (!pid || b.passenger_id === pid));
    return userBookings.map(bk => {
      const bus = mockState.buses.find(b => b.bus_id === bk.bus_id) || {};
      const passenger = mockState.passengers.find(p => p.passenger_id === bk.passenger_id) || {};
      return {
        ...bk,
        primary_contact_name: passenger.name,
        primary_contact_email: passenger.email,
        primary_contact_phone: passenger.phone,
        bus_no: bus.bus_no,
        bus_name: bus.bus_name,
        source: bus.source,
        destination: bus.destination,
        departure_time: bus.departure_time,
        arrival_time: bus.arrival_time,
        duration: bus.duration,
        bus_type: bus.bus_type,
        travel_date: bus.travel_date
      };
    });
  }

  // 14. My Bookings with joined bus info
  if (norm.includes('FROM bookings bk') && norm.includes('JOIN buses b') && norm.includes('bk.passenger_id = ?')) {
    const pid = Number(params[0]);
    const userBookings = mockState.bookings.filter(b => b.passenger_id === pid);
    return userBookings.map(bk => {
      const bus = mockState.buses.find(b => b.bus_id === bk.bus_id) || {};
      return {
        ...bk,
        bus_no: bus.bus_no,
        bus_name: bus.bus_name,
        source: bus.source,
        destination: bus.destination,
        departure_time: bus.departure_time,
        arrival_time: bus.arrival_time,
        duration: bus.duration,
        bus_type: bus.bus_type,
        travel_date: bus.travel_date
      };
    }).sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
  }

  // 15. Cancel booking by reference
  if (norm.includes('UPDATE bookings SET status = \'CANCELLED\' WHERE booking_ref = ?')) {
    const ref = params[0];
    const pid = params[1] ? Number(params[1]) : null;
    let count = 0;
    mockState.bookings.forEach(b => {
      if (b.booking_ref === ref && (!pid || b.passenger_id === pid) && b.status === 'CONFIRMED') {
        b.status = 'CANCELLED';
        count++;
      }
    });
    return { affectedRows: count };
  }

  // 16. Select active bookings for a reference
  if (norm.includes('FROM bookings WHERE booking_ref = ?') && norm.includes("status = 'CONFIRMED'")) {
    const ref = params[0];
    const pid = params[1] ? Number(params[1]) : null;
    return mockState.bookings.filter(b => b.booking_ref === ref && (!pid || b.passenger_id === pid) && b.status === 'CONFIRMED');
  }

  return [];
}

// Automatically initiate connection check
initDB();

module.exports = {
  query,
  executeTransaction,
  initDB,
  isMySQLConnected: () => isConnected
};
