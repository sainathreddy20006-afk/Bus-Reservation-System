-- ==========================================================
-- SAINATH BUS RESERVATION SYSTEM
-- Database Schema & Initial Seed Data
-- ==========================================================

-- 1. Create database schema
CREATE DATABASE IF NOT EXISTS `sainath_bus_reservation`
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `sainath_bus_reservation`;

-- 2. Drop existing tables if needed (in reverse foreign key order)
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `buses`;
DROP TABLE IF EXISTS `passengers`;

-- 3. Create `passengers` table
CREATE TABLE `passengers` (
  `passenger_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('MEMBER', 'ADMIN') NOT NULL DEFAULT 'MEMBER',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_passenger_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create `buses` table
CREATE TABLE `buses` (
  `bus_id` INT AUTO_INCREMENT PRIMARY KEY,
  `bus_no` VARCHAR(20) NOT NULL UNIQUE,
  `bus_name` VARCHAR(100) NOT NULL DEFAULT 'Sainath Royal Express',
  `source` VARCHAR(50) NOT NULL,
  `destination` VARCHAR(50) NOT NULL,
  `departure_time` TIME NOT NULL,
  `arrival_time` TIME NOT NULL,
  `duration` VARCHAR(30) NOT NULL DEFAULT '6 hrs',
  `total_seats` INT NOT NULL DEFAULT 40,
  `available_seats` INT NOT NULL DEFAULT 40,
  `fare` DECIMAL(10,2) NOT NULL,
  `bus_type` VARCHAR(50) NOT NULL,
  `travel_date` DATE NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bus_route_date` (`source`, `destination`, `travel_date`),
  INDEX `idx_travel_date` (`travel_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create `bookings` table
-- Each record represents a booked seat with booking_ref grouping multi-seat orders
CREATE TABLE `bookings` (
  `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_ref` VARCHAR(30) NOT NULL,
  `passenger_id` INT NOT NULL,
  `bus_id` INT NOT NULL,
  `booking_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `seat_no` VARCHAR(10) NOT NULL,
  `passenger_name` VARCHAR(100) NOT NULL,
  `passenger_age` INT DEFAULT 25,
  `passenger_gender` VARCHAR(10) DEFAULT 'Male',
  `fare` DECIMAL(10,2) NOT NULL,
  `status` ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  FOREIGN KEY (`passenger_id`) REFERENCES `passengers`(`passenger_id`) ON DELETE CASCADE,
  FOREIGN KEY (`bus_id`) REFERENCES `buses`(`bus_id`) ON DELETE CASCADE,
  INDEX `idx_booking_ref` (`booking_ref`),
  INDEX `idx_passenger_id` (`passenger_id`),
  INDEX `idx_bus_seat_status` (`bus_id`, `seat_no`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- 6. Insert Seed Data: Buses for multiple dates and popular routes
-- ==========================================================

-- Populate buses for multiple upcoming dates (including CURRENT_DATE and +1, +2, +3, +7 days)
INSERT INTO `buses` 
(`bus_no`, `bus_name`, `source`, `destination`, `departure_time`, `arrival_time`, `duration`, `total_seats`, `available_seats`, `fare`, `bus_type`, `travel_date`)
VALUES
-- Mumbai <-> Shirdi
('SN-101', 'Sainath Super Luxury AC Sleeper', 'Mumbai', 'Shirdi', '06:00:00', '12:30:00', '6h 30m', 40, 38, 750.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-102', 'Sainath Royal Volvo Multi-Axle', 'Mumbai', 'Shirdi', '14:30:00', '20:45:00', '6h 15m', 40, 40, 850.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-103', 'Sainath Night Rider Express', 'Mumbai', 'Shirdi', '22:00:00', '04:30:00', '6h 30m', 40, 36, 650.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-104', 'Sainath Pilgrimage Star', 'Shirdi', 'Mumbai', '07:30:00', '14:00:00', '6h 30m', 40, 40, 750.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-105', 'Sainath Evening Return', 'Shirdi', 'Mumbai', '21:30:00', '04:00:00', '6h 30m', 40, 40, 650.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Pune <-> Shirdi
('SN-201', 'Sainath Shirdi Express', 'Pune', 'Shirdi', '05:30:00', '10:30:00', '5h 00m', 40, 40, 550.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-202', 'Sainath Divine Tour Sleeper', 'Pune', 'Shirdi', '23:00:00', '04:15:00', '5h 15m', 40, 37, 700.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-203', 'Sainath Shirdi Return Express', 'Shirdi', 'Pune', '13:00:00', '18:15:00', '5h 15m', 40, 40, 550.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Mumbai <-> Pune
('SN-301', 'Sainath Expressway Shuttle', 'Mumbai', 'Pune', '07:00:00', '10:30:00', '3h 30m', 40, 40, 400.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-302', 'Sainath Intercity Comfort', 'Mumbai', 'Pune', '17:00:00', '20:30:00', '3h 30m', 40, 39, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-303', 'Sainath Metro Connect', 'Pune', 'Mumbai', '08:00:00', '11:30:00', '3h 30m', 40, 40, 400.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Pune <-> Goa
('SN-401', 'Sainath Coastal Queen Sleeper', 'Pune', 'Goa', '20:00:00', '06:30:00', '10h 30m', 40, 35, 1100.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-402', 'Sainath Sunset Cruiser', 'Pune', 'Goa', '21:30:00', '08:00:00', '10h 30m', 40, 40, 950.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Hyderabad <-> Bangalore
('SN-501', 'Sainath Tech Corridor Volvo', 'Hyderabad', 'Bangalore', '21:00:00', '06:00:00', '9h 00m', 40, 36, 1200.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-502', 'Sainath Deccan Express', 'Hyderabad', 'Bangalore', '22:30:00', '07:30:00', '9h 00m', 40, 40, 1050.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-503', 'Sainath Royal Connect', 'Bangalore', 'Hyderabad', '21:30:00', '06:30:00', '9h 00m', 40, 40, 1200.00, 'Volvo Multi-Axle AC', CURDATE()),

-- Nashik <-> Pune & Mumbai
('SN-601', 'Sainath Godavari Fast', 'Nashik', 'Pune', '06:30:00', '11:00:00', '4h 30m', 40, 40, 450.00, 'Non-AC Seater (2+2)', CURDATE()),
('SN-602', 'Sainath Nashik Highway Star', 'Nashik', 'Mumbai', '15:00:00', '19:30:00', '4h 30m', 40, 40, 480.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Andhra Pradesh Hub Routes (Kurnool, Nandyal, Vijayawada, Guntur, Visakhapatnam, Tirupati, Kadapa, Anantapur)
('SN-AP-101', 'Sainath Royal Volvo Multi-Axle', 'Kurnool', 'Hyderabad', '06:00:00', '09:45:00', '3h 45m', 40, 36, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-102', 'Sainath Tungabhadra Express', 'Kurnool', 'Hyderabad', '14:30:00', '18:15:00', '3h 45m', 40, 40, 380.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-103', 'Sainath Rayalaseema Sleeper', 'Kurnool', 'Hyderabad', '23:15:00', '03:30:00', '4h 15m', 40, 32, 550.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-104', 'Sainath Day Rider Seater', 'Kurnool', 'Hyderabad', '08:30:00', '12:30:00', '4h 00m', 40, 38, 300.00, 'Non-AC Seater (2+2)', CURDATE()),
('SN-AP-105', 'Sainath Tungabhadra Return', 'Hyderabad', 'Kurnool', '07:00:00', '10:45:00', '3h 45m', 40, 39, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-106', 'Sainath Night Express', 'Hyderabad', 'Kurnool', '22:30:00', '02:30:00', '4h 00m', 40, 35, 550.00, 'AC Sleeper (2+1)', CURDATE()),

('SN-AP-201', 'Sainath Silicon Corridor Volvo', 'Kurnool', 'Bengaluru', '07:00:00', '13:00:00', '6h 00m', 40, 34, 750.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-202', 'Sainath Bengaluru Night Sleeper', 'Kurnool', 'Bengaluru', '22:30:00', '05:00:00', '6h 30m', 40, 28, 850.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-203', 'Sainath Deccan Semi-Sleeper', 'Kurnool', 'Bengaluru', '15:00:00', '21:15:00', '6h 15m', 40, 40, 650.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

('SN-AP-301', 'Sainath Amaravati Highway Express', 'Kurnool', 'Vijayawada', '06:30:00', '13:30:00', '7h 00m', 40, 36, 600.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-302', 'Sainath Krishna River Sleeper', 'Kurnool', 'Vijayawada', '21:30:00', '04:45:00', '7h 15m', 40, 30, 750.00, 'AC Sleeper (2+1)', CURDATE()),

('SN-AP-401', 'Sainath Balaji Pilgrimage Express', 'Kurnool', 'Tirupati', '06:00:00', '13:00:00', '7h 00m', 40, 35, 580.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-402', 'Sainath Seven Hills Sleeper', 'Kurnool', 'Tirupati', '22:00:00', '05:15:00', '7h 15m', 40, 29, 720.00, 'AC Sleeper (2+1)', CURDATE()),

('SN-AP-501', 'Sainath Rayalaseema Shuttle', 'Kurnool', 'Nandyal', '07:30:00', '09:00:00', '1h 30m', 40, 38, 150.00, 'Non-AC Seater (2+2)', CURDATE()),
('SN-AP-503', 'Sainath Nandyal-Bengaluru Sleeper', 'Nandyal', 'Bengaluru', '21:00:00', '05:30:00', '8h 30m', 40, 33, 800.00, 'AC Sleeper (2+1)', CURDATE()),

('SN-AP-601', 'Sainath Coastal Queen Multi-Axle', 'Vijayawada', 'Visakhapatnam', '06:00:00', '12:00:00', '6h 00m', 40, 36, 700.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-602', 'Sainath Vizag City Sleeper', 'Vijayawada', 'Visakhapatnam', '23:00:00', '05:30:00', '6h 30m', 40, 27, 850.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-603', 'Sainath Vizag Coastal Return', 'Visakhapatnam', 'Vijayawada', '07:30:00', '13:30:00', '6h 00m', 40, 39, 700.00, 'Volvo Multi-Axle AC', CURDATE()),

('SN-AP-701', 'Sainath Mirchi Express Multi-Axle', 'Guntur', 'Hyderabad', '06:30:00', '12:00:00', '5h 30m', 40, 35, 550.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-702', 'Sainath Amaravati Capitals Sleeper', 'Guntur', 'Hyderabad', '22:30:00', '04:30:00', '6h 00m', 40, 30, 680.00, 'AC Sleeper (2+1)', CURDATE()),

('SN-AP-801', 'Sainath Metro Connect Volvo', 'Tirupati', 'Chennai', '07:00:00', '10:30:00', '3h 30m', 40, 38, 420.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-802', 'Sainath Pilgrim Highway Star', 'Tirupati', 'Chennai', '16:00:00', '19:45:00', '3h 45m', 40, 40, 380.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

('SN-AP-901', 'Sainath Penna Valley Express', 'Kadapa', 'Hyderabad', '21:00:00', '05:00:00', '8h 00m', 40, 34, 750.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-902', 'Sainath Airport Corridor Volvo', 'Anantapur', 'Bengaluru', '06:00:00', '09:30:00', '3h 30m', 40, 37, 450.00, 'Volvo Multi-Axle AC', CURDATE());

-- Insert buses for tomorrow as well
INSERT INTO `buses` 
(`bus_no`, `bus_name`, `source`, `destination`, `departure_time`, `arrival_time`, `duration`, `total_seats`, `available_seats`, `fare`, `bus_type`, `travel_date`)
VALUES
('SN-101-T', 'Sainath Super Luxury AC Sleeper', 'Mumbai', 'Shirdi', '06:00:00', '12:30:00', '6h 30m', 40, 40, 750.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-102-T', 'Sainath Royal Volvo Multi-Axle', 'Mumbai', 'Shirdi', '14:30:00', '20:45:00', '6h 15m', 40, 40, 850.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-103-T', 'Sainath Night Rider Express', 'Mumbai', 'Shirdi', '22:00:00', '04:30:00', '6h 30m', 40, 40, 650.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-201-T', 'Sainath Shirdi Express', 'Pune', 'Shirdi', '05:30:00', '10:30:00', '5h 00m', 40, 40, 550.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-202-T', 'Sainath Divine Tour Sleeper', 'Pune', 'Shirdi', '23:00:00', '04:15:00', '5h 15m', 40, 40, 700.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-301-T', 'Sainath Expressway Shuttle', 'Mumbai', 'Pune', '07:00:00', '10:30:00', '3h 30m', 40, 40, 400.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-401-T', 'Sainath Coastal Queen Sleeper', 'Pune', 'Goa', '20:00:00', '06:30:00', '10h 30m', 40, 40, 1100.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-501-T', 'Sainath Tech Corridor Volvo', 'Hyderabad', 'Bangalore', '21:00:00', '06:00:00', '9h 00m', 40, 40, 1200.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY));

-- 7. Insert a sample registered test user (password: Test@123)
-- bcrypt hash for 'Test@123'
INSERT INTO `passengers` (`passenger_id`, `name`, `email`, `phone`, `password_hash`)
VALUES (1, 'Rahul Sharma', 'rahul@example.com', '9876543210', '$2a$10$wN9vK7h8v1r/M5xZquhYpOFW4mE7iY7rN2lI9QjUaW.Y6q4u8Yqxe');
