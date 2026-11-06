/**
 * Comprehensive Automated System Test Suite for Sainath Bus Reservation System
 * Validates all backend APIs, transactions, authentication, and business rules
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting Sainath Bus Reservation Automated Test Suite');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  let cookie = '';

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Extract session cookie
      cookie = setCookie.split(';')[0];
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { status: res.status, ok: res.ok, data };
  }

  const testEmail = `tester_${Date.now()}@example.com`;
  const initialPassword = 'Password@123';
  const updatedPassword = 'NewSecret@456';

  console.log('\n--- 1. Testing Registration API ---');
  // 1.1 Valid Registration
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sunil Gavaskar',
      email: testEmail,
      phone: '9822012345',
      password: initialPassword,
      confirmPassword: initialPassword
    })
  });
  assert(regRes.status === 201 && regRes.data.success, 'New user registration succeeds with 201', `ID: ${regRes.data?.user?.passenger_id}`);

  // 1.2 Duplicate Email Detection
  const dupRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Duplicate User',
      email: testEmail,
      phone: '9822000000',
      password: 'password123',
      confirmPassword: 'password123'
    })
  });
  assert(dupRes.status === 409 && !dupRes.data.success, 'Duplicate email registration rejected with 409 Conflict');

  // 1.3 Password length validation (< 6 chars)
  const shortPwdRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Short Pwd',
      email: `short_${Date.now()}@example.com`,
      phone: '9822000000',
      password: '123',
      confirmPassword: '123'
    })
  });
  assert(shortPwdRes.status === 400, 'Password under 6 characters rejected with 400 Bad Request');

  console.log('\n--- 2. Testing Authentication & Session Status ---');
  // 2.1 Current session check
  const meRes = await request('/api/auth/me');
  assert(meRes.data.authenticated && meRes.data.user.email === testEmail, 'Session properly initialized and verified via /api/auth/me');

  // 2.2 Logout
  const logoutRes = await request('/api/auth/logout', { method: 'POST' });
  assert(logoutRes.data.success, 'Logout terminates session successfully');

  // Verify unauthenticated me
  cookie = '';
  const unauthMe = await request('/api/auth/me');
  assert(!unauthMe.data.authenticated, 'Unauthenticated check returns authenticated: false');
  const unauthAdmin = await request('/api/admin/dashboard');
  assert(unauthAdmin.status === 401, 'Unauthenticated users cannot access the admin dashboard');

  // 2.3 Invalid Login Password
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
  });
  assert(badLogin.status === 401, 'Login with incorrect password rejected with 401 Unauthorized');

  // 2.4 Valid Login
  const goodLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: initialPassword })
  });
  assert(goodLogin.status === 200 && goodLogin.data.success, 'Login with correct bcrypt hash succeeds with 200');
  const memberAdminAccess = await request('/api/admin/dashboard');
  assert(memberAdminAccess.status === 403, 'Member accounts are denied admin dashboard access');

  console.log('\n--- 3. Testing User Profile & Password Change ---');
  // 3.1 Get Profile
  const profileRes = await request('/api/user/profile');
  assert(profileRes.data.success && profileRes.data.profile.name === 'Sunil Gavaskar', 'Profile retrieved correctly');

  // 3.2 Update Profile
  const updateProfRes = await request('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Sunil M. Gavaskar', phone: '9822998877' })
  });
  assert(updateProfRes.data.success && updateProfRes.data.user.name === 'Sunil M. Gavaskar', 'Profile update succeeded');

  // 3.3 Change Password with wrong current password
  const badChangePwd = await request('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: 'IncorrectOldPassword',
      newPassword: updatedPassword,
      confirmPassword: updatedPassword
    })
  });
  assert(badChangePwd.status === 400, 'Password change with wrong current password rejected');

  // 3.4 Valid Password Change
  const goodChangePwd = await request('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: initialPassword,
      newPassword: updatedPassword,
      confirmPassword: updatedPassword
    })
  });
  assert(goodChangePwd.status === 200 && goodChangePwd.data.success, 'Password changed successfully');

  // 3.5 Verify Login with Old Password fails and New Password succeeds
  await request('/api/auth/logout', { method: 'POST' });
  cookie = '';

  const oldPwdLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: initialPassword })
  });
  assert(oldPwdLogin.status === 401, 'Old password no longer valid');

  const newPwdLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: updatedPassword })
  });
  assert(newPwdLogin.status === 200 && newPwdLogin.data.success, 'Login with new password succeeds');

  console.log('\n--- 4. Testing Bus Search & Availability ---');
  // 4.1 Cities endpoint (verify Andhra Pradesh cities)
  const citiesRes = await request('/api/buses/cities');
  const apCitiesPresent = ['Kurnool', 'Vijayawada', 'Visakhapatnam', 'Tirupati', 'Guntur', 'Nandyal', 'Kadapa', 'Anantapur']
    .every(c => citiesRes.data.sources.includes(c) && citiesRes.data.destinations.includes(c));
  assert(apCitiesPresent, 'City lists include all Andhra Pradesh key cities (Kurnool, Vijayawada, Vizag, Tirupati, etc.)');

  // 4.2 Search buses for AP route (Kurnool -> Hyderabad)
  const apSearchRes = await request('/api/buses/search?source=Kurnool&destination=Hyderabad');
  assert(apSearchRes.data.count > 0, `AP Route search (Kurnool -> Hyderabad) returned ${apSearchRes.data.count} direct buses`);

  // 4.3 Search buses Mumbai -> Shirdi
  const searchRes = await request('/api/buses/search?source=Mumbai&destination=Shirdi');
  assert(searchRes.data.count > 0, `Interstate search (Mumbai -> Shirdi) returned ${searchRes.data.count} matching buses`);

  const testBus = apSearchRes.data.buses[0];
  const busId = testBus.bus_id;

  // 4.3 Get Seats Layout for test bus
  const seatsRes = await request(`/api/buses/${busId}/seats`);
  assert(seatsRes.data.seats.length === 40, 'Seat configuration returns 40 seats layout');
  const initialAvailableSeats = seatsRes.data.available_count;

  console.log('\n--- 5. Testing Booking Creation & Concurrency Protection ---');
  // Find two unbooked seats
  const availableSeats = seatsRes.data.seats.filter(s => !s.is_booked);
  assert(availableSeats.length >= 2, 'Found at least 2 available seats for booking');

  const seatToBook1 = availableSeats[0].seat_no;
  const seatToBook2 = availableSeats[1].seat_no;

  // 5.1 Create Booking for 2 seats
  const bookRes = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      bus_id: busId,
      passengers: [
        { seat_no: seatToBook1, name: 'Sunil Gavaskar', age: 34, gender: 'Male' },
        { seat_no: seatToBook2, name: 'Rohan Gavaskar', age: 10, gender: 'Male' }
      ]
    })
  });
  assert(bookRes.status === 201 && bookRes.data.success, 'Multi-seat booking created successfully', `Ref: ${bookRes.data.booking.bookingRef}`);
  const bookingRef = bookRes.data.booking.bookingRef;

  // 5.2 Concurrency Check: Try to book the exact same seat again!
  const duplicateSeatBooking = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      bus_id: busId,
      passengers: [
        { seat_no: seatToBook1, name: 'Another Passenger', age: 29, gender: 'Female' }
      ]
    })
  });
  assert(duplicateSeatBooking.status === 409, 'Duplicate seat booking prevented with 409 Conflict!');

  // 5.3 Check that available seats count decreased by 2
  const updatedSeatsRes = await request(`/api/buses/${busId}/seats`);
  assert(updatedSeatsRes.data.available_count === initialAvailableSeats - 2, 'Available seats count decremented accurately by 2');

  console.log('\n--- 6. Testing My Bookings & Ticket Generation ---');
  // 6.1 View My Bookings
  const myBookingsRes = await request('/api/bookings/my-bookings');
  assert(myBookingsRes.data.count > 0, 'Booking appears in user booking history');
  const foundBooking = myBookingsRes.data.bookings.find(b => b.booking_ref === bookingRef);
  assert(foundBooking && foundBooking.seats.length === 2, 'Booking history shows 2 seats under the reference');

  // 6.2 View Ticket Details
  const ticketRes = await request(`/api/bookings/ticket/${bookingRef}`);
  assert(ticketRes.data.success && ticketRes.data.ticket.booking_ref === bookingRef, 'Ticket details retrieved accurately with primary contact info');

  console.log('\n--- 7. Testing Booking Cancellation & Seat Restoration ---');
  // 7.1 Cancel Booking
  const cancelRes = await request(`/api/bookings/${bookingRef}/cancel`, { method: 'POST' });
  assert(cancelRes.status === 200 && cancelRes.data.success, 'Booking cancellation succeeds', `Seats released: ${cancelRes.data.result.seatsReleased}`);

  // 7.2 Verify Seat Count Restored
  const postCancelSeats = await request(`/api/buses/${busId}/seats`);
  assert(postCancelSeats.data.available_count === initialAvailableSeats, 'Available seats restored to original count after cancellation!');

  // 7.3 Verify Cancelled Seat Can Now Be Rebooked
  const rebookRes = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      bus_id: busId,
      passengers: [
        { seat_no: seatToBook1, name: 'Rebooked Passenger', age: 25, gender: 'Male' }
      ]
    })
  });
  assert(rebookRes.status === 201, 'Previously cancelled seat is immediately available and rebookable!');

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    console.log('\n--- 8. Testing Administrator Dashboard ---');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      })
    });
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', 'Configured admin account receives the ADMIN role on login');

    const dashboard = await request('/api/admin/dashboard');
    assert(
      dashboard.status === 200 && dashboard.data.success &&
        Number.isFinite(dashboard.data.stats.booked_members) &&
        Number.isFinite(dashboard.data.stats.confirmed_seats),
      'Admin dashboard returns member and confirmed-seat totals'
    );
    assert(
      dashboard.data.bookings.some(booking =>
        booking.booking_ref === rebookRes.data.booking.bookingRef &&
        booking.passenger_name === 'Rebooked Passenger' &&
        booking.member_phone === '9822998877'),
      'Admin dashboard shows all booking and member contact details'
    );
    assert(
      dashboard.data.bookings.some(booking => booking.booking_ref === bookingRef && booking.status === 'CANCELLED'),
      'Admin dashboard retains cancelled booking history'
    );

    const adminBooking = dashboard.data.bookings.find(booking => booking.booking_ref === rebookRes.data.booking.bookingRef);
    const updateBooking = await request(`/api/admin/bookings/${adminBooking.booking_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        passenger_name: 'Admin Edited Passenger',
        passenger_age: 31,
        passenger_gender: 'Other',
        seat_no: String(seatToBook1),
        fare: 700,
        status: 'CONFIRMED'
      })
    });
    assert(updateBooking.status === 200 && updateBooking.data.success, 'Admin can edit passenger and booking details');

    const removeBookedBus = await request(`/api/admin/buses/${busId}`, { method: 'DELETE' });
    assert(removeBookedBus.status === 409, 'Admin cannot remove a bus with confirmed bookings');

    const cancelFromAdmin = await request(`/api/admin/bookings/${adminBooking.booking_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        passenger_name: 'Admin Edited Passenger',
        passenger_age: 31,
        passenger_gender: 'Other',
        seat_no: String(seatToBook1),
        fare: 700,
        status: 'CANCELLED'
      })
    });
    assert(cancelFromAdmin.status === 200 && cancelFromAdmin.data.success, 'Admin can cancel a booking and release the seat');

    const removeBus = await request(`/api/admin/buses/${busId}`, { method: 'DELETE' });
    assert(removeBus.status === 200 && removeBus.data.success, 'Admin can archive a bus after its confirmed bookings are cancelled');
    const archivedBus = await request(`/api/buses/${busId}`);
    assert(archivedBus.status === 404, 'Archived bus is hidden from public bus details');
    const restoreBus = await request(`/api/admin/buses/${busId}/restore`, { method: 'PATCH' });
    assert(restoreBus.status === 200 && restoreBus.data.success, 'Admin can restore an archived bus');

    const member = dashboard.data.members.find(item => item.email === testEmail);
    const updateMember = await request(`/api/admin/members/${member.passenger_id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Admin Updated Member', email: testEmail, phone: '9822998876' })
    });
    assert(updateMember.status === 200 && updateMember.data.success, 'Admin can update member contact details');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const travelDate = tomorrow.toISOString().slice(0, 10);
    const newBus = await request('/api/admin/buses', {
      method: 'POST',
      body: JSON.stringify({
        bus_no: `TEST-${Date.now()}`,
        bus_name: 'Admin Test Coach',
        source: 'Kurnool',
        destination: 'Hyderabad',
        departure_time: '09:00',
        arrival_time: '13:00',
        duration: '4h',
        total_seats: 36,
        fare: 500,
        bus_type: 'AC Seater',
        travel_date: travelDate
      })
    });
    assert(newBus.status === 201 && newBus.data.success, 'Admin can add a new bus');

    if (newBus.data.bus_id) {
      const busUpdate = await request(`/api/admin/buses/${newBus.data.bus_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          bus_no: `TEST-${Date.now()}`,
          bus_name: 'Updated Admin Test Coach',
          source: 'Kurnool',
          destination: 'Hyderabad',
          departure_time: '10:00',
          arrival_time: '14:00',
          duration: '4h',
          total_seats: 36,
          fare: 550,
          bus_type: 'AC Seater',
          travel_date: travelDate,
          is_active: true
        })
      });
      assert(busUpdate.status === 200 && busUpdate.data.success, 'Admin can edit bus schedule and fare');
      const removeNewBus = await request(`/api/admin/buses/${newBus.data.bus_id}`, { method: 'DELETE' });
      assert(removeNewBus.status === 200 && removeNewBus.data.success, 'Admin can remove a bus with no confirmed bookings');
    }
  } else {
    console.log('\n--- 8. Administrator Dashboard tests skipped (set ADMIN_EMAIL and ADMIN_PASSWORD) ---');
  }

  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed === 0) {
    console.log('🎉 ALL BACKEND API & BUSINESS RULE TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
