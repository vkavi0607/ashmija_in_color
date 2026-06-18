# ashmija in color - Premium Mural Studio Management Platform

![ashmija in color](frontend/assets/images/muralart.png)

> Connecting spaces and brands with South Asia's premium mural artists

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

## 🎨 Overview

**ashmija in color** is a comprehensive mural studio management platform that enables freelancing artists and studios to:

- Manage portfolio of mural projects with image galleries
- Curate and manage artist profiles with portfolios and availability
- Handle client inquiries and project management
- Collect and display client reviews
- Maintain frequently asked questions
- Configure site-wide settings and branding

The platform features a public landing page showcasing the studio's work and an admin dashboard for full content management.

## ✨ Features

### Public Site
- 🎬 Animated landing page with scroll progress indicator
- 🖼️ Portfolio gallery showcasing mural projects
- 👥 Artist showcase with profiles and portfolios
- ⭐ Client reviews and testimonials
- ❓ FAQ section
- 📝 Contact inquiry form
- 📱 Fully responsive design

### Admin Dashboard
- 🔐 Secure authentication system
- 📊 Dashboard with activity metrics and statistics
- 🎯 Portfolio management (CRUD operations with image upload)
- 👨‍🎨 Artist management with availability toggles
- 📧 Inquiry management with filtering and CSV export
- ⭐ Review approval workflow with ratings
- ❓ FAQ management with drag-and-drop reordering
- ⚙️ Site configuration management
- 📋 Complete audit logging

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Flexbox, Grid, Animations, Glass-morphism
- **Vanilla JavaScript** - No framework dependencies
- **Tabler Icons** - Icon library
- **SortableJS** - Drag-and-drop functionality
- **Quill.js** - Rich text editor for content

### Backend & Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL Database
  - Authentication (Email/Password)
  - Storage for media files
- **Audit Logging** - Complete activity tracking

### DevOps (Ready for deployment)
- **Docker** - Containerization
- **Docker Compose** - Local orchestration
- **Nginx** - Production reverse proxy
- **CI/CD** - GitHub Actions pipelines (placeholder)

## 📁 Project Structure

```
artwall-studio/
│
├── frontend/                          # Client-side application
│   ├── admin/                        # Admin dashboard
│   │   ├── index.html               # Admin dashboard entry
│   │   ├── css/admin.css            # Admin styles
│   │   └── js/                      # Admin modules
│   │
│   ├── assets/                       # Static media
│   │   ├── images/                  # Stock images
│   │   ├── icons/                   # Icon assets
│   │   ├── artists/                 # Uploaded artist photos
│   │   └── uploads/                 # Portfolio uploads
│   │
│   ├── css/                         # Stylesheets
│   ├── js/                          # JavaScript
│   │   ├── shared/                  # Shared utilities
│   │   │   ├── supabase.js         # Supabase client
│   │   │   └── data-loader.js      # Data utilities
│   │   └── public/                  # Public site scripts
│   │
│   ├── index.html                   # Landing page
│   └── 404.html                     # Error page
│
├── backend/                          # Backend API (future)
│   ├── routes/                      # API endpoints
│   ├── controllers/                 # Business logic
│   ├── services/                    # External services
│   ├── middleware/                  # Express middleware
│   ├── models/                      # Data models
│   ├── config/                      # Configuration
│   └── utils/                       # Utilities
│
├── database/                        # Database
│   ├── schema/                      # Schema definitions
│   ├── migrations/                  # Database migrations
│   ├── backups/                     # Database backups
│   └── seeds/                       # Seed data
│
├── ml/                              # Machine Learning (future)
│   ├── models/                      # ML models
│   ├── training/                    # Training scripts
│   ├── prediction/                  # Prediction APIs
│   ├── datasets/                    # Training data
│   └── api/                         # ML service API
│
├── docker/                          # Docker configuration
│   ├── frontend/                    # Frontend Dockerfile
│   ├── backend/                     # Backend Dockerfile
│   └── ml/                          # ML Dockerfile
│
├── nginx/                           # Nginx configuration
├── scripts/                         # Deployment scripts
├── tests/                           # Test suites
│   ├── frontend/
│   ├── backend/
│   └── ml/
│
├── docs/                            # Documentation
│   ├── architecture/                # Architecture docs
│   ├── api/                         # API documentation
│   ├── deployment/                  # Deployment guides
│   └── database/                    # Database docs
│
├── .github/workflows/               # CI/CD pipelines
├── .env.example                     # Environment template
├── docker-compose.yml               # Docker orchestration
└── README.md                        # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ (for backend development)
- Docker & Docker Compose (for containerized deployment)
- Supabase account with project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/artwall-studio.git
   cd artwall-studio
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Local Development**
   ```bash
   # Open frontend/index.html in your browser
   # For live server, use VS Code Live Server extension or similar
   ```

4. **Docker Deployment**
   ```bash
   docker-compose up -d
   ```

## ⚙️ Configuration

### Supabase Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Run the schema initialization:
   ```bash
   # Execute database/schema/artwall_supabase_setup.sql in your Supabase SQL editor
   ```
3. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Admin Credentials

Add admin user through Supabase Authentication or use the provided setup script.

## 📚 Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Database Schema](docs/database/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [Setup Instructions](docs/SETUP.md)

## 🐳 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Admin: http://localhost:5173/admin
```

### Production Deployment
```bash
# Build production images
docker build -t artwall-frontend:latest -f docker/frontend/Dockerfile .

# Push to registry
docker push your-registry/artwall-frontend:latest

# Deploy with orchestration (K8s, Docker Swarm, etc.)
```

## 🧪 Testing

```bash
# Frontend tests (future)
npm run test:frontend

# Backend tests (future)
npm run test:backend

# All tests
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@ashmijaincolor.com or open an issue on GitHub.

## 🎯 Roadmap

- [ ] Backend API development (Node.js/Express)
- [ ] Machine Learning integration for mural recommendation
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Multi-language support
- [ ] Payment integration
- [ ] Real-time collaboration tools
- [ ] API documentation with Swagger

---

**Built with ❤️ by ashmija in color team**
