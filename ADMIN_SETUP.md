# Administrator account setup

The administrator console at `http://localhost:3000/admin.html` shows live booking, member, and bus information. It refreshes booking data automatically every 30 seconds and supports manual refresh. Only accounts with the `ADMIN` role can access its management APIs.

1. Configure the database connection in `.env` as usual, and add the admin's details:

   ```env
   ADMIN_NAME=System Administrator
   ADMIN_EMAIL=admin@example.com
   ADMIN_PHONE=9876543210
   ADMIN_PASSWORD=choose-a-strong-password
   ```

2. Ensure the database has been initialized. For a new installation, run `npm run init-db`. **This project initialization script recreates the tables, so do not run it against a database containing data you need to keep.**
3. Run `npm run setup-admin`. This command safely adds the account-role and bus-archive columns if needed, then creates the admin account. If the email already exists, it promotes that account and sets its password to `ADMIN_PASSWORD`.
4. Start the app with `npm start`, then sign in with the admin email and password. Admin accounts are sent to the dashboard after login.

The console lets admins add and edit buses, edit member contact details, see all passenger and account-contact details for each booking, edit passenger/seat/fare details, and confirm or cancel individual seats. Removing a bus takes it off sale only after its confirmed bookings are cancelled; it archives the bus rather than deleting it, preserving booking history. Archived buses can be restored.

Use a strong password of at least 8 characters. The setup command accepts 4-character passwords for compatibility, but short passwords are much easier to guess; `1234` is especially unsafe for an administrator account. The admin password is stored as a bcrypt hash. Keep `.env` private and do not commit it.
