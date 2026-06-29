# Setup Instructions

## Prerequisites

- Node.js 16+ (for future backend development)
- Supabase account
- Docker & Docker Compose (optional, for containerized deployment)
- Git

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/artwall-studio.git
cd artwall-studio
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Required:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### 3. Supabase Database Setup

```sql
-- 1. Open your Supabase SQL Editor
-- 2. Copy and run the schema from: database/schema/artwall_supabase_setup.sql
-- 3. This creates all required tables and policies
```

### 4. Create Admin User

In Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add user"
3. Enter admin email and password
4. Confirm email (or enable email confirmation bypass for development)

Use this exact admin account for the dashboard:
- Email: `admin@ashmijaincolor.com`
- Password: `parrot`
- Confirm the user after creating it, or use the SQL setup script below which marks that email as confirmed for development
- If login fails with RLS errors, the account is usually missing, unconfirmed, or signed in with the wrong project
- Do not use a simplified one-off SQL block with different column names; the app expects the schema in `database/schema/artwall_supabase_setup.sql`

### 5. Upload Assets

In Supabase Dashboard:
1. Go to Storage → Create new bucket "artwall-media"
2. Set bucket to public
3. Upload initial images to appropriate folders

### 6. Run Frontend

```bash
# Option A: Use VS Code Live Server
# 1. Install "Live Server" extension
# 2. Right-click frontend/index.html → "Open with Live Server"

# Option B: Use Python simple server
cd frontend
python -m http.server 8000
# Visit http://localhost:8000

# Option C: Use Node.js simple server
cd frontend
npx http-server -p 8000
```

### 7. Access Application

- **Public Site:** http://localhost:8000
- **Admin Panel:** http://localhost:8000/admin
- **Login:** Use the admin credentials created in step 4

## Docker Development Setup

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Services

- **Frontend:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin
- **Backend API:** http://localhost:3000 (when implemented)

## Database Initialization

### First Time Setup

```bash
# Execute schema script via Supabase SQL editor:
cat database/schema/artwall_supabase_setup.sql | pbcopy  # macOS
# or
cat database/schema/artwall_supabase_setup.sql | xclip   # Linux
# or copy manually on Windows

# Then paste into Supabase SQL editor and run
```

### Seed Data (Optional)

```bash
# After schema is created, you can optionally seed data
# Scripts coming soon...
```

## Troubleshooting

### Supabase Connection Issues

1. Verify credentials in `.env`:
   - VITE_SUPABASE_URL should be your project URL
   - VITE_SUPABASE_ANON_KEY should be your anonymous key

2. Check browser console for errors

3. Verify Supabase project is active

### Authentication Issues

1. Ensure `admin@ashmijaincolor.com` exists in Supabase Auth
2. Confirm the email in Supabase, or run the schema script in `database/schema/artwall_supabase_setup.sql` to set `confirmed_at`
3. Check Row Level Security (RLS) policies in `database/schema/artwall_supabase_setup.sql`
4. Verify the login is using the same Supabase project URL and anon key as the database you updated
5. If the dashboard shows blank counts, re-run `database/schema/artwall_supabase_setup.sql` so the seed rows and policies are applied

### File Upload Issues

1. Ensure "artwall-media" bucket exists in Supabase Storage
2. Check bucket is set to public
3. Verify RLS policies allow uploads

### Docker Issues

```bash
# Reset Docker environment
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment

### Environment Setup

```bash
# Update .env for production
VITE_SUPABASE_URL=production_url
VITE_SUPABASE_ANON_KEY=production_key
BACKEND_ENV=production
ENABLE_DEBUG_MODE=false
```

### Docker Production Build

```bash
# Build for production
docker build -t artwall-frontend:latest -f docker/frontend/Dockerfile --target production .

# Test locally
docker run -p 80:80 -e VITE_SUPABASE_URL=$VITE_SUPABASE_URL -e VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY artwall-frontend:latest

# Push to registry
docker push your-registry/artwall-frontend:latest
```

### Cloud Deployment

Supported platforms:
- Vercel (frontend)
- Netlify (frontend)
- AWS (ECS, Lambda)
- Google Cloud (Cloud Run)
- Azure (App Service, Container Instances)
- DigitalOcean (App Platform, Kubernetes)

## Development Workflow

### Project Structure

```
frontend/
├── admin/              # Admin dashboard
├── assets/             # Images and media
├── css/                # Stylesheets
├── js/                 # JavaScript modules
│   ├── shared/        # Shared utilities
│   └── public/        # Public site scripts
├── index.html         # Landing page
└── 404.html          # Error page
```

### Adding New Features

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes to frontend files
3. Test locally using Live Server or Docker
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

### Code Standards

- Use semantic HTML
- Follow CSS naming conventions (BEM)
- Use descriptive JavaScript variable names
- Add JSDoc comments for functions
- Keep functions focused and reusable
- Use const/let, avoid var
- Arrow functions for consistency

## Monitoring & Debugging

### Browser Console

```javascript
// Check Supabase connection
console.log(window.supabase);

// Test API call
window.supabase.from('portfolio').select('*').then(console.log);

// View audit logs
window.supabase.from('audit_log').select('*').then(console.log);
```

### Supabase Monitoring

1. Go to Supabase Dashboard → Logs
2. Check for error patterns
3. Monitor RLS violations
4. Review storage access logs

### Performance

```javascript
// Check performance metrics
console.table(performance.getEntriesByType('measure'));

// Profile specific function
console.time('functionName');
// ... function code ...
console.timeEnd('functionName');
```

## Next Steps

1. Familiarize yourself with the codebase
2. Review [Architecture Documentation](architecture/)
3. Check [API Documentation](api/)
4. Study [Database Schema](database/)
5. Explore admin features by logging in

## Support

For issues or questions:
1. Check existing documentation
2. Review GitHub issues
3. Contact team lead
4. Check browser console for errors

---

**Last Updated:** 2024
**Version:** 1.0.0
