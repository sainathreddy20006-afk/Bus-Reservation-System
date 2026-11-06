-- ==========================================================
-- SAINATH BUS RESERVATION SYSTEM
-- Andhra Pradesh & Regional Routes Expansion Seed Script
-- Safe script: Uses INSERT IGNORE on unique `bus_no`
-- Does NOT drop tables or overwrite user bookings.
-- ==========================================================

USE `sainath_bus_reservation`;

-- Insert Andhra Pradesh routes for CURDATE() and upcoming days
INSERT IGNORE INTO `buses` 
(`bus_no`, `bus_name`, `source`, `destination`, `departure_time`, `arrival_time`, `duration`, `total_seats`, `available_seats`, `fare`, `bus_type`, `travel_date`)
VALUES
-- Kurnool -> Hyderabad
('SN-AP-101', 'Sainath Royal Volvo Multi-Axle', 'Kurnool', 'Hyderabad', '06:00:00', '09:45:00', '3h 45m', 40, 36, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-102', 'Sainath Tungabhadra Express', 'Kurnool', 'Hyderabad', '14:30:00', '18:15:00', '3h 45m', 40, 40, 380.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-103', 'Sainath Rayalaseema Sleeper', 'Kurnool', 'Hyderabad', '23:15:00', '03:30:00', '4h 15m', 40, 32, 550.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-104', 'Sainath Day Rider Seater', 'Kurnool', 'Hyderabad', '08:30:00', '12:30:00', '4h 00m', 40, 38, 300.00, 'Non-AC Seater (2+2)', CURDATE()),

-- Hyderabad -> Kurnool
('SN-AP-105', 'Sainath Tungabhadra Return', 'Hyderabad', 'Kurnool', '07:00:00', '10:45:00', '3h 45m', 40, 39, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-106', 'Sainath Night Express', 'Hyderabad', 'Kurnool', '22:30:00', '02:30:00', '4h 00m', 40, 35, 550.00, 'AC Sleeper (2+1)', CURDATE()),

-- Kurnool -> Bengaluru
('SN-AP-201', 'Sainath Silicon Corridor Volvo', 'Kurnool', 'Bengaluru', '07:00:00', '13:00:00', '6h 00m', 40, 34, 750.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-202', 'Sainath Bengaluru Night Sleeper', 'Kurnool', 'Bengaluru', '22:30:00', '05:00:00', '6h 30m', 40, 28, 850.00, 'AC Sleeper (2+1)', CURDATE()),
('SN-AP-203', 'Sainath Deccan Semi-Sleeper', 'Kurnool', 'Bengaluru', '15:00:00', '21:15:00', '6h 15m', 40, 40, 650.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Bengaluru -> Kurnool
('SN-AP-204', 'Sainath Bengaluru Return Volvo', 'Bengaluru', 'Kurnool', '21:45:00', '04:15:00', '6h 30m', 40, 37, 750.00, 'Volvo Multi-Axle AC', CURDATE()),

-- Kurnool -> Vijayawada
('SN-AP-301', 'Sainath Amaravati Highway Express', 'Kurnool', 'Vijayawada', '06:30:00', '13:30:00', '7h 00m', 40, 36, 600.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-302', 'Sainath Krishna River Sleeper', 'Kurnool', 'Vijayawada', '21:30:00', '04:45:00', '7h 15m', 40, 30, 750.00, 'AC Sleeper (2+1)', CURDATE()),

-- Vijayawada -> Kurnool
('SN-AP-303', 'Sainath Amaravati Return', 'Vijayawada', 'Kurnool', '22:00:00', '05:00:00', '7h 00m', 40, 38, 750.00, 'AC Sleeper (2+1)', CURDATE()),

-- Kurnool -> Tirupati
('SN-AP-401', 'Sainath Balaji Pilgrimage Express', 'Kurnool', 'Tirupati', '06:00:00', '13:00:00', '7h 00m', 40, 35, 580.00, 'AC Semi-Sleeper (2+2)', CURDATE()),
('SN-AP-402', 'Sainath Seven Hills Sleeper', 'Kurnool', 'Tirupati', '22:00:00', '05:15:00', '7h 15m', 40, 29, 720.00, 'AC Sleeper (2+1)', CURDATE()),

-- Tirupati -> Kurnool
('SN-AP-403', 'Sainath Balaji Return', 'Tirupati', 'Kurnool', '21:30:00', '04:45:00', '7h 15m', 40, 36, 720.00, 'AC Sleeper (2+1)', CURDATE()),

-- Kurnool -> Nandyal
('SN-AP-501', 'Sainath Rayalaseema Shuttle', 'Kurnool', 'Nandyal', '07:30:00', '09:00:00', '1h 30m', 40, 38, 150.00, 'Non-AC Seater (2+2)', CURDATE()),
('SN-AP-502', 'Sainath Mahanandi Express', 'Kurnool', 'Nandyal', '17:30:00', '19:00:00', '1h 30m', 40, 40, 180.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Nandyal -> Bengaluru
('SN-AP-503', 'Sainath Nandyal-Bengaluru Sleeper', 'Nandyal', 'Bengaluru', '21:00:00', '05:30:00', '8h 30m', 40, 33, 800.00, 'AC Sleeper (2+1)', CURDATE()),

-- Vijayawada -> Visakhapatnam
('SN-AP-601', 'Sainath Coastal Queen Multi-Axle', 'Vijayawada', 'Visakhapatnam', '06:00:00', '12:00:00', '6h 00m', 40, 36, 700.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-602', 'Sainath Vizag City Sleeper', 'Vijayawada', 'Visakhapatnam', '23:00:00', '05:30:00', '6h 30m', 40, 27, 850.00, 'AC Sleeper (2+1)', CURDATE()),

-- Visakhapatnam -> Vijayawada
('SN-AP-603', 'Sainath Vizag Coastal Return', 'Visakhapatnam', 'Vijayawada', '07:30:00', '13:30:00', '6h 00m', 40, 39, 700.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-604', 'Sainath Vizag Night Express', 'Visakhapatnam', 'Vijayawada', '22:30:00', '05:00:00', '6h 30m', 40, 31, 850.00, 'AC Sleeper (2+1)', CURDATE()),

-- Guntur -> Hyderabad
('SN-AP-701', 'Sainath Mirchi Express Multi-Axle', 'Guntur', 'Hyderabad', '06:30:00', '12:00:00', '5h 30m', 40, 35, 550.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-702', 'Sainath Amaravati Capitals Sleeper', 'Guntur', 'Hyderabad', '22:30:00', '04:30:00', '6h 00m', 40, 30, 680.00, 'AC Sleeper (2+1)', CURDATE()),

-- Tirupati -> Chennai
('SN-AP-801', 'Sainath Metro Connect Volvo', 'Tirupati', 'Chennai', '07:00:00', '10:30:00', '3h 30m', 40, 38, 420.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-802', 'Sainath Pilgrim Highway Star', 'Tirupati', 'Chennai', '16:00:00', '19:45:00', '3h 45m', 40, 40, 380.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Kadapa -> Hyderabad
('SN-AP-901', 'Sainath Penna Valley Express', 'Kadapa', 'Hyderabad', '21:00:00', '05:00:00', '8h 00m', 40, 34, 750.00, 'AC Sleeper (2+1)', CURDATE()),

-- Anantapur -> Bengaluru
('SN-AP-902', 'Sainath Airport Corridor Volvo', 'Anantapur', 'Bengaluru', '06:00:00', '09:30:00', '3h 30m', 40, 37, 450.00, 'Volvo Multi-Axle AC', CURDATE()),
('SN-AP-903', 'Sainath Highway Star Sleeper', 'Anantapur', 'Bengaluru', '23:30:00', '03:15:00', '3h 45m', 40, 35, 550.00, 'AC Sleeper (2+1)', CURDATE()),

-- Nellore -> Chennai
('SN-AP-904', 'Sainath Coastal Express', 'Nellore', 'Chennai', '07:00:00', '10:45:00', '3h 45m', 40, 38, 350.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Rajahmundry -> Vijayawada
('SN-AP-905', 'Sainath Godavari Gateway', 'Rajahmundry', 'Vijayawada', '06:30:00', '09:45:00', '3h 15m', 40, 39, 320.00, 'AC Semi-Sleeper (2+2)', CURDATE()),

-- Kurnool -> Goa
('SN-AP-906', 'Sainath Western Ghats Holiday Sleeper', 'Kurnool', 'Goa', '18:00:00', '07:30:00', '13h 30m', 40, 26, 1250.00, 'AC Sleeper (2+1)', CURDATE()),

-- Tirupati -> Shirdi
('SN-AP-907', 'Sainath Divya Darshan Superfast', 'Tirupati', 'Shirdi', '14:00:00', '08:30:00', '18h 30m', 40, 24, 1600.00, 'AC Sleeper (2+1)', CURDATE());

-- Insert the same AP routes for tomorrow as well
INSERT IGNORE INTO `buses` 
(`bus_no`, `bus_name`, `source`, `destination`, `departure_time`, `arrival_time`, `duration`, `total_seats`, `available_seats`, `fare`, `bus_type`, `travel_date`)
VALUES
('SN-AP-101-T', 'Sainath Royal Volvo Multi-Axle', 'Kurnool', 'Hyderabad', '06:00:00', '09:45:00', '3h 45m', 40, 40, 450.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-102-T', 'Sainath Tungabhadra Express', 'Kurnool', 'Hyderabad', '14:30:00', '18:15:00', '3h 45m', 40, 40, 380.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-103-T', 'Sainath Rayalaseema Sleeper', 'Kurnool', 'Hyderabad', '23:15:00', '03:30:00', '4h 15m', 40, 40, 550.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-201-T', 'Sainath Silicon Corridor Volvo', 'Kurnool', 'Bengaluru', '07:00:00', '13:00:00', '6h 00m', 40, 40, 750.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-202-T', 'Sainath Bengaluru Night Sleeper', 'Kurnool', 'Bengaluru', '22:30:00', '05:00:00', '6h 30m', 40, 40, 850.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-301-T', 'Sainath Amaravati Highway Express', 'Kurnool', 'Vijayawada', '06:30:00', '13:30:00', '7h 00m', 40, 40, 600.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-401-T', 'Sainath Balaji Pilgrimage Express', 'Kurnool', 'Tirupati', '06:00:00', '13:00:00', '7h 00m', 40, 40, 580.00, 'AC Semi-Sleeper (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-501-T', 'Sainath Rayalaseema Shuttle', 'Kurnool', 'Nandyal', '07:30:00', '09:00:00', '1h 30m', 40, 40, 150.00, 'Non-AC Seater (2+2)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-601-T', 'Sainath Coastal Queen Multi-Axle', 'Vijayawada', 'Visakhapatnam', '06:00:00', '12:00:00', '6h 00m', 40, 40, 700.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-701-T', 'Sainath Mirchi Express Multi-Axle', 'Guntur', 'Hyderabad', '06:30:00', '12:00:00', '5h 30m', 40, 40, 550.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-801-T', 'Sainath Metro Connect Volvo', 'Tirupati', 'Chennai', '07:00:00', '10:30:00', '3h 30m', 40, 40, 420.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-901-T', 'Sainath Penna Valley Express', 'Kadapa', 'Hyderabad', '21:00:00', '05:00:00', '8h 00m', 40, 40, 750.00, 'AC Sleeper (2+1)', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('SN-AP-902-T', 'Sainath Airport Corridor Volvo', 'Anantapur', 'Bengaluru', '06:00:00', '09:30:00', '3h 30m', 40, 40, 450.00, 'Volvo Multi-Axle AC', DATE_ADD(CURDATE(), INTERVAL 1 DAY));
