# 🔧 Workshop Management API

A comprehensive FastAPI-based workshop management system for automotive repair shops with Arabic language support.

## ✨ Features

### 🚗 Vehicle Management
- Vehicle registration and tracking
- Customer information management
- Service history tracking
- Real-time status updates
- Tracking links for customers

### 👥 Customer Management
- Customer profiles and contact information
- Visit history and service records
- Automatic customer creation during vehicle registration
- Search and filtering capabilities

### 🔧 Service & Parts Management
- Service catalog with pricing
- Parts inventory management
- Low stock alerts
- Supplier information tracking

### 👨‍🔧 Technician Management
- Technician profiles and specialties
- Job assignment and tracking
- Performance metrics and ratings

### 💰 Financial Management
- Invoice generation and management
- Transaction tracking (income/expenses)
- Monthly financial reports
- Payment method tracking

### 🤖 AI Assistant
- Arabic-language automotive AI assistant
- Technical advice and troubleshooting
- Parts information and maintenance guidance
- Chat session management

### 📁 File Management
- Image and document uploads
- File serving and management
- Vehicle documentation storage

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- MongoDB
- Required environment variables

### Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```env
   MONGO_URL=mongodb://localhost:27017
   EMERGENT_LLM_KEY=your_ai_key_here
   ```

3. **Initialize the database:**
   ```bash
   python init_data.py
   ```

4. **Start the server:**
   ```bash
   ./start_server.sh
   # OR
   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```

5. **Access the API:**
   - API: http://localhost:8000/api/
   - Documentation: http://localhost:8000/docs
   - Interactive API: http://localhost:8000/redoc

## 📚 API Endpoints

### Vehicle Management
- `POST /api/vehicles` - Create new vehicle entry
- `GET /api/vehicles` - List all vehicles (with filters)
- `GET /api/vehicles/{id}` - Get vehicle details
- `PUT /api/vehicles/{id}` - Update vehicle information
- `GET /api/vehicles/track/{tracking_link}` - Track vehicle by link

### Customer Management
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer details
- `GET /api/customers/{id}/history` - Get customer service history

### Parts Management
- `POST /api/parts` - Add new part
- `GET /api/parts` - List parts (with search and low stock filter)
- `GET /api/parts/{id}` - Get part details
- `PUT /api/parts/{id}` - Update part information
- `DELETE /api/parts/{id}` - Delete part

### Invoice & Financial
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/{id}` - Get invoice details
- `POST /api/transactions` - Record transaction
- `GET /api/transactions` - List transactions with summary

### AI Assistant
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/sessions/{id}` - Get chat session

### File Management
- `POST /api/upload` - Upload file
- `GET /api/files/{filename}` - Download file

### Dashboard
- `GET /api/stats` - Get dashboard statistics

## 🗄️ Database Schema

### Collections
- `vehicles` - Vehicle information and service records
- `customers` - Customer profiles and contact information
- `technicians` - Technician profiles and specialties
- `services` - Service catalog with pricing
- `parts` - Parts inventory and supplier information
- `invoices` - Invoice records and billing information
- `transactions` - Financial transactions (income/expenses)
- `chat_sessions` - AI assistant chat sessions

## 🔧 Configuration

### Environment Variables
- `MONGO_URL` - MongoDB connection string
- `EMERGENT_LLM_KEY` - AI service API key for chat functionality

### Default Data
The system comes pre-populated with:
- 4 sample technicians with different specialties
- 15 common automotive services
- 8 essential parts with inventory

## 🌟 Key Features Explained

### Vehicle Tracking System
Each vehicle gets a unique tracking link that customers can use to check their vehicle's status without logging in.

### Automatic Customer Management
When a new vehicle is registered, the system automatically creates or links to existing customer records based on phone number.

### Inventory Management
Parts inventory includes purchase/selling prices, quantity tracking, and automatic low-stock alerts.

### Financial Tracking
Complete financial overview with income from services, expense tracking, and profit calculations.

### AI Assistant
Arabic-language AI assistant specialized in automotive repair, providing technical advice and troubleshooting help.

## 🔒 Security Features
- CORS middleware for cross-origin requests
- Input validation using Pydantic models
- Error handling and logging
- File upload security

## 📱 Frontend Integration
This API is designed to work with modern frontend frameworks. All endpoints return JSON and support:
- RESTful design patterns
- Consistent error responses
- Pagination support
- Search and filtering
- File upload/download

## 🛠️ Development

### Code Structure
```
backend/
├── server.py          # Main FastAPI application
├── models.py          # Pydantic data models
├── init_data.py       # Database initialization
├── requirements.txt   # Python dependencies
├── start_server.sh    # Startup script
└── uploads/          # File upload directory
```

### Adding New Features
1. Define models in `models.py`
2. Add API endpoints in `server.py`
3. Update initialization data if needed
4. Test endpoints using the interactive docs

## 📊 Monitoring & Logging
- Comprehensive logging for all operations
- Error tracking and debugging information
- Performance monitoring capabilities

## 🤝 Contributing
1. Follow the existing code structure
2. Add proper error handling
3. Include logging for important operations
4. Test all endpoints thoroughly
5. Update documentation as needed

## 📄 License
This project is designed for automotive workshop management and includes Arabic language support for the Middle East market.