# 🔴 Next Steps - MySQL Setup

## Step 1: Open MySQL Credentials File
Open: `backend/config/database.js`
Find lines 13-17:
```javascript
user: 'root',              // 🔴 Your MySQL username
password: 'shk@ags2313', // 🔴 Your MySQL password
```

## Step 2: Fill Your MySQL Credentials

### If using XAMPP/WAMP:
```
user: 'root'
password: ''  (leave empty)
```

### If using MySQL Workbench:
- Open MySQL Workbench
- Click your connection
- The username is shown in the connection
- Usually: `user: 'root'`, `password: 'your_mysql_password'`

### If using Cloud MySQL (Aiven/PlanetScale/RDS):
```
user: your_cloud_username
password: your_cloud_password
host: your-cloud-host.com
```

## Step 3: Save the file

## Step 4: Run MySQL Schema
1. Open MySQL Workbench OR phpMyAdmin
2. Create database named: `ashmija_in_color`
3. Run the SQL file: `database/schema/mysql_schema.sql`

## Step 5: Install Backend
```bash
cd backend
npm install
node server.js
```
Server should show: `ashmija_in_color API running on http://localhost:4000`

## Step 6: Open Website
Open `frontend/index.html` in browser (right-click → Open in Browser)