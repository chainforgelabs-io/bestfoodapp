# Best Food App 🍔🏆

A comprehensive food discovery and ranking platform that helps users find the best restaurants and food items in their city through community-driven reviews and expert ratings.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

Best Food App is a full-stack web application designed to solve the problem of finding quality food in any city. By combining expert reviews from food critics with community feedback, the platform provides reliable rankings and recommendations for restaurants and specific food items.

### What It Does

- **City-Based Food Discovery**: Search for the best restaurants and food items in any city
- **Dual Rating System**: Combines admin (expert) scores with community ratings for balanced recommendations
- **Comprehensive Food Categorization**: Detailed taxonomy covering cuisines, restaurant types, food categories, and dietary preferences
- **Interactive Leaderboards**: Dynamic rankings showing top 10 items across various categories
- **Review Management**: User-friendly review submission with standardized categorization
- **Restaurant Management**: Add new restaurants and food items to expand the database

### Goals

1. **Democratize Food Discovery**: Make high-quality food recommendations accessible to everyone
2. **Reduce Decision Fatigue**: Provide clear, ranked recommendations to simplify dining choices
3. **Support Local Businesses**: Help great restaurants gain visibility through fair, transparent ratings
4. **Build Food Community**: Create a platform where food enthusiasts can share and discover experiences
5. **Maintain Quality Standards**: Ensure review authenticity through moderation and expert oversight

## ✨ Features

### 🏠 Core Features

#### Home Page & Search

- **City-based search** with Google Places autocomplete
- **Dynamic filtering** by restaurants or food items
- **SEO-optimized URLs** for city-specific pages
- **Responsive design** optimized for mobile and desktop

#### Leaderboards

- **Global leaderboards** showing best items worldwide
- **City-specific rankings** filtered by location
- **Category filtering** (restaurants, food items, cuisines)
- **Top 10 rankings** across all categories
- **Real-time updates** based on new reviews

#### Review System

- **Standardized categorization** using comprehensive taxonomy
- **Dual scoring system**: Admin scores (expert) + Community scores
- **Rich food categorization**: 12+ food categories, 50+ food types, 200+ subtypes
- **Dietary tags**: Vegetarian, vegan, gluten-free, etc.
- **Price range indicators**

#### Restaurant Management

- **Add new restaurants** with address validation
- **Comprehensive restaurant profiles** with cuisine types and ambiance
- **Food item management** for each restaurant
- **Google Maps integration** for location services

### 🔐 User Management

#### Authentication

- **Secure JWT-based authentication**
- **Password reset functionality** with email verification
- **Role-based access control** (Admin/User)
- **Protected routes** for authenticated features

#### User Profiles

- **Personal review history**
- **Account management**
- **Review statistics**

### 📱 Mobile Optimization

- **Progressive Web App (PWA)** capabilities
- **Mobile-first responsive design**
- **Touch-optimized interfaces**
- **Safe area support** for notched devices
- **Optimized modal and tooltip positioning**

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React SPA)   │◄──►│   (Express API) │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Vercel  │             │ Vercel  │             │ MongoDB │
    │ (Static)│             │(Serverless)│          │ Atlas   │
    └─────────┘             └─────────┘             └─────────┘
```

### Data Flow

1. **User Interaction**: User searches for food in a city
2. **API Request**: Frontend sends request to Express API
3. **Database Query**: API queries MongoDB for relevant data
4. **Score Calculation**: System calculates combined scores (admin + community)
5. **Response**: Ranked results returned to frontend
6. **Display**: Results displayed with rankings and details

### Key Components

#### Frontend (React)

- **Pages**: Home, Leaderboards, Restaurant Details, Review Submission, User Management
- **Components**: Reusable UI components with consistent styling
- **Hooks**: Custom hooks for city URL management and data fetching
- **Utils**: Standardized options for food categorization and city utilities

#### Backend (Express.js)

- **Routes**: RESTful API endpoints for all data operations
- **Models**: Mongoose schemas for data validation
- **Middleware**: Authentication, CORS, error handling
- **Utils**: Helper functions for scoring and data processing

#### Database (MongoDB)

- **Collections**: Users, Restaurants, FoodItems, Reviews, Addresses
- **Indexes**: Optimized for location-based and score-based queries
- **Aggregation**: Complex queries for leaderboards and rankings

## 🛠️ Technology Stack

### Frontend

- **React 18.3.1**: Modern React with hooks and functional components
- **React Router 6**: Client-side routing with SEO-friendly URLs
- **Axios**: HTTP client for API communication
- **React Helmet Async**: SEO meta tag management
- **Google Maps API**: Location services and autocomplete
- **CSS3**: Custom styling with mobile-first responsive design

### Backend

- **Node.js**: JavaScript runtime
- **Express.js 4.19.2**: Web application framework
- **MongoDB 6.8.0**: NoSQL database
- **Mongoose 8.5.4**: MongoDB object modeling
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Nodemailer**: Email functionality
- **CORS**: Cross-origin resource sharing

### Infrastructure

- **Vercel**: Hosting platform for both frontend and serverless backend
- **MongoDB Atlas**: Cloud database hosting
- **Vercel Analytics**: Performance and usage analytics
- **Google Places API**: Location and autocomplete services

### Development Tools

- **Concurrently**: Run frontend and backend simultaneously
- **ESLint**: Code linting and formatting
- **Git**: Version control
- **npm Workspaces**: Monorepo management

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm 8+
- MongoDB Atlas account (or local MongoDB)
- Google Maps API key

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd food-ranking-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**

Create `.env` files in the backend directory:

**Backend `.env**:\*\*

```env
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-jwt-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NODE_ENV=development
```

**Frontend environment variables** (if needed):

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

4. **Start Development Servers**

```bash
npm run dev
```

This will start:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### Development Workflow

1. **Frontend Development**: Make changes in `frontend/src/`
2. **Backend Development**: Make changes in `backend/`
3. **Database Changes**: Update models in `backend/models/`
4. **API Changes**: Update routes in `backend/routes/`

## 📚 API Documentation

### Base URL

- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

### Authentication

Most endpoints require JWT authentication via Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Restaurants

- `GET /restaurants/search` - Search restaurants by location
- `GET /restaurants/:id` - Get restaurant details
- `POST /restaurants` - Create new restaurant (auth required)

#### Food Items

- `GET /food-items/rank/category/:category/city/:city` - Get ranked food items
- `GET /food-items/restaurant/:restaurantId` - Get restaurant's food items
- `POST /food-items` - Create new food item (auth required)

#### Reviews

- `POST /reviews` - Submit new review (auth required)
- `GET /reviews/user/:userId` - Get user's reviews (auth required)

#### Leaderboards

- `GET /leaderboards/filtered` - Get filtered leaderboards by city/category
- `GET /leaderboards/food-items/:type` - Get global food item rankings
- `GET /leaderboards/categories` - Get available categories for city

#### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password/:token` - Reset password

### Response Format

```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": {...}
}
```

## 🗄️ Database Schema

### Collections

#### Users

```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Restaurants

```javascript
{
  _id: ObjectId,
  name: String (required),
  address: ObjectId (ref: 'Address'),
  cuisine: [String],
  type: String,
  ambiance: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### FoodItems

```javascript
{
  _id: ObjectId,
  name: String (required),
  restaurant: ObjectId (ref: 'Restaurant'),
  category: String,
  type: String,
  subType: String,
  price: Number,
  adminScore: Number (0-100),
  communityScore: Number (0-100),
  dietaryTags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### Reviews

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),
  restaurant: ObjectId (ref: 'Restaurant'),
  foodItem: ObjectId (ref: 'FoodItem'),
  score: Number (1-100),
  comment: String,
  userRole: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Addresses

```javascript
{
  _id: ObjectId,
  street: String,
  city: String (required),
  province: String,
  country: String,
  postalCode: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}
```

### Indexing Strategy

- **Location-based queries**: Compound indexes on city, province, country
- **Score-based queries**: Indexes on adminScore and communityScore
- **Text search**: Text indexes on restaurant and food item names
- **User queries**: Indexes on user references for reviews

## 🚀 Deployment

### Vercel Deployment

The application is configured for seamless Vercel deployment:

1. **Frontend**: Static site deployment
2. **Backend**: Serverless functions
3. **Database**: MongoDB Atlas (cloud)

### Deployment Configuration

**vercel.json** handles:

- Static asset caching
- API route forwarding
- SPA routing fallback

### Environment Variables (Production)

Set these in Vercel dashboard:

- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `NODE_ENV=production`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (for S3 uploads)
- `S3_BUCKET_NAME` — default bucket for public review photos (presigned `PUT` with `public-read` ACL for `prefix=reviews` / default)
- `S3_RECEIPTS_BUCKET` (optional) — if set, receipt images use this bucket; otherwise the same as `S3_BUCKET_NAME`. Use a **private** bucket (Block all public access) or a bucket policy that denies public reads on the `receipts/` prefix. Receipts are read only via time-limited signed `GET` URLs.
- `CDN_BASE_URL` (optional) — only used for public review photo URLs, not for private receipts

### Build Process

```bash
npm run build
```

Builds optimized production bundle in `frontend/build/`

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow existing patterns and ESLint rules
2. **Component Structure**: Use functional components with hooks
3. **API Design**: Follow RESTful conventions
4. **Database**: Use Mongoose for all database operations
5. **Authentication**: Always validate user permissions
6. **Error Handling**: Implement comprehensive error handling

### Adding New Features

1. **Food Categories**: Update `frontend/src/utils/standardizedOptions.js`
2. **API Endpoints**: Add routes in `backend/routes/`
3. **Database Models**: Update schemas in `backend/models/`
4. **UI Components**: Add to `frontend/src/components/`

### Testing

- Frontend: React Testing Library
- Backend: Jest (to be implemented)
- Integration: Postman collections

## 📊 Analytics & Monitoring

- **Vercel Analytics**: Performance monitoring and user analytics
- **Error Tracking**: Console logging and error boundaries
- **Performance**: Web Vitals tracking
- **SEO**: Comprehensive meta tag management

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs with salt rounds
- **CORS Configuration**: Restrictive CORS for production
- **Input Validation**: Mongoose schema validation
- **XSS Protection**: React's built-in XSS protection
- **Environment Variables**: Sensitive data in env vars

## 📱 Mobile Features

- **Responsive Design**: Mobile-first approach
- **Touch Optimization**: Touch-friendly interfaces
- **PWA Support**: Progressive Web App capabilities
- **Safe Area Support**: iOS notch compatibility
- **Optimized Modals**: Mobile-specific modal positioning

---

## 📞 Support

For questions, issues, or contributions, please refer to the project repository or contact the development team.

**Built with ❤️ for food lovers everywhere** 🍕🌮🍜
