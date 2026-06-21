# ashmija_in_color Backend - MySQL Setup

## Prerequisites
1. Node.js installed (https://nodejs.org/)
2. MySQL installed (XAMPP, WAMP, MySQL Workbench, or cloud MySQL)

## Step 1: Edit MySQL Credentials

Open **`backend/config/database.js`** and find these lines:

```javascript
host: 'localhost',         // Change if your MySQL is on another server
port: 3306,                // Change if your MySQL uses different port
user: 'root',              // 🔴 CHANGE THIS: Your MySQL username
password: 'shk@ags2313', // 🔴 CHANGE THIS: Your MySQL password
database: 'ashmija_in_color', // Change if you want different DB name
```

### Common MySQL Credentials:

**XAMPP/WAMP:**
```
user: 'root'
password: ''  (leave empty, no password)
```

**MySQL Workbench (default):**
```
user: 'root'
password: 'root'  or  '' (empty)
```

**Cloud MySQL (Aiven/PlanetScale/RDS):**
```
host: 'your-host.aivencloud.com'
port: 12345  (check your provider)
user: 'avnadmin'
password: 'your-cloud-password'
database: 'defaultdb'  (or your DB name)
```

## Step 2: Create Database Tables

Open MySQL Workbench OR phpMyAdmin and run the SQL file:
**`database/schema/mysql_schema.sql`**

This creates the `ashmija_in_color` database and all tables.

## Step 3: Install Dependencies

```bash
cd backend
npm install
```

## Step 4: Start the Server

```bash
node server.js
```

OR double-click: **`start-backend.bat`**

You should see:
```
[Server] MySQL connected successfully
[Server] ashmija_in_color API running on http://localhost:4000
[Server] API Base URL: http://localhost:4000/api
```

## Step 5: Test the API

Open browser and visit:
- `http://localhost:4000/api` - Should show API info
- `http://localhost:4000/api/health` - Should show `{"status":"ok"}`

## Step 6: Open the Website

Open `frontend/index.html` in your browser.

---

## Troubleshooting

### "Cannot GET /api" error:
- Server is not running → Follow Step 4
- Check the terminal where you ran `node server.js` for errors
- If you see MySQL connection error → Check credentials in Step 1

### MySQL connection errors:
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- MySQL server is not running → Start XAMPP/WAMP/MySQL Workbench
- Wrong port → Change `port: 3306` in database.js

```
Error: Access denied for user 'root'@'localhost'
```
- Wrong username/password → Check Step 1 credentials

### Port 4000 already in use:
Change the port in `backend/server.js`:
```javascript
const PORT = 4001;  // Use different port
```
And update `frontend/js/shared/api-client.js`:
```javascript
const API_BASE_URL = 'http://localhost:4001';
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | List all portfolio items |
| GET | `/api/portfolio/public` | Public portfolio items |
| POST | `/api/portfolio` | Create portfolio item |
| PUT | `/api/portfolio/:id` | Update portfolio item |
| DELETE | `/api/portfolio/:id` | Delete portfolio item |
| PUT | `/api/portfolio/reorder` | Reorder items |
| GET | `/api/artists` | List all artists |
| POST | `/api/artists` | Create artist |
| PUT | `/api/artists/:id` | Update artist |
| DELETE | `/api/artists/:id` | Delete artist |
| PUT | `/api/artists/reorder` | Reorder artists |
| GET | `/api/reviews` | List all reviews |
| POST | `/api/reviews` | Create review |
| PATCH | `/api/reviews/:id` | Approve/pin review |
| DELETE | `/api/reviews/:id` | Delete review |
| GET | `/api/faqs` | List all FAQs |
| POST | `/api/faqs` | Create FAQ |
| PUT | `/api/faqs/:id` | Update FAQ |
| DELETE | `/api/faqs/:id` | Delete FAQ |
| GET | `/api/config` | Get site config |
| PUT | `/api/config` | Update site config |
| POST | `/api/inquiries` | Submit contact form |
| GET | `/api/health` | Health check |