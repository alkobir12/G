# API Contracts & Backend Implementation Plan

## Overview
نظام إدارة ورش الميكانيكا - يربط بين الورشة والعملاء والفنيين مع تكامل الذكاء الاصطناعي

## Current Status
✅ Frontend مكتمل مع Mock Data
⏳ Backend سيتم تطويره
⏳ Claude AI Integration سيتم إضافته
⏳ WhatsApp Integration (سيتم لاحقاً)

---

## API Contracts

### 1. Vehicle Management APIs

#### POST /api/vehicles
**Description**: استقبال مركبة جديدة
**Request Body**:
```json
{
  "plateNumber": "أ ب ج 1234",
  "brand": "تويوتا",
  "model": "كامري",
  "year": 2020,
  "color": "أبيض",
  "customerName": "محمد أحمد",
  "customerPhone": "0501234567",
  "customerEmail": "optional@email.com",
  "services": ["1", "2"],
  "technicianId": "1",
  "notes": "صوت غريب من المحرك"
}
```
**Response**:
```json
{
  "id": "vehicle_id",
  "trackingLink": "TRK-XXX",
  "status": "diagnosis",
  "entryDate": "ISO_DATE",
  "estimatedCompletion": "ISO_DATE"
}
```

#### GET /api/vehicles
**Description**: جلب جميع المركبات
**Query Params**: 
- status (optional): diagnosis|quotation|repair|ready
- search (optional): رقم اللوحة أو اسم العميل

#### GET /api/vehicles/:id
**Description**: جلب تفاصيل مركبة واحدة

#### PUT /api/vehicles/:id
**Description**: تحديث حالة المركبة أو معلوماتها
**Request Body**:
```json
{
  "status": "repair",
  "technicianId": "2",
  "notes": "تم تشخيص المشكلة"
}
```

#### GET /api/vehicles/track/:trackingLink
**Description**: تتبع المركبة للعميل (صفحة عامة)

---

### 2. Customer Management APIs

#### GET /api/customers
**Description**: جلب قائمة العملاء
**Response**: مع تاريخ الزيارات والمركبات

#### GET /api/customers/:id
**Description**: تفاصيل عميل محدد مع سجل المركبات

#### POST /api/customers
**Description**: إضافة عميل جديد (يتم تلقائياً عند إضافة مركبة)

---

### 3. Technician Management APIs

#### GET /api/technicians
**Description**: جلب قائمة الفنيين

#### GET /api/technicians/:id
**Description**: تفاصيل فني محدد مع الأعمال النشطة

#### PUT /api/technicians/:id
**Description**: تحديث معلومات الفني

---

### 4. Service Catalog APIs

#### GET /api/services
**Description**: جلب قائمة الخدمات المتوفرة

---

### 5. AI Assistant APIs

#### POST /api/ai/chat
**Description**: التحدث مع مساعد Claude AI
**Request Body**:
```json
{
  "message": "ما هو سبب ارتفاع حرارة المحرك؟",
  "conversationId": "optional_session_id"
}
```
**Response**:
```json
{
  "response": "AI Response",
  "conversationId": "session_id"
}
```

---

### 6. Notification APIs (Future)

#### POST /api/notifications/whatsapp
**Description**: إرسال إشعار واتساب للعميل
**Request Body**:
```json
{
  "customerId": "customer_id",
  "vehicleId": "vehicle_id",
  "message": "تم تحديث حالة مركبتك",
  "trackingLink": "TRK-XXX"
}
```

---

## Mock Data Replacement Plan

### Files with Mock Data:
1. `/app/frontend/src/mock/data.js` - سيتم حذفه
2. `/app/frontend/src/pages/Dashboard.jsx` - استبدال vehicles بـ API call
3. `/app/frontend/src/pages/Customers.jsx` - استبدال customers بـ API call
4. `/app/frontend/src/pages/Technicians.jsx` - استبدال technicians بـ API call
5. `/app/frontend/src/pages/VehicleDetails.jsx` - استبدال vehicle data بـ API call
6. `/app/frontend/src/pages/CustomerTracking.jsx` - استبدال vehicle data بـ API call
7. `/app/frontend/src/pages/AIAssistant.jsx` - ربط مع Claude API
8. `/app/frontend/src/pages/NewVehicle.jsx` - ربط form submission مع API

---

## Backend Implementation Steps

### Phase 1: Database Models (MongoDB)
1. **Vehicle Model**
   - Basic info (plate, brand, model, year, color)
   - Customer reference
   - Status (diagnosis, quotation, repair, ready)
   - Assigned technician
   - Services array
   - Notes, images
   - Timestamps (entry, estimated, completed)
   - Tracking link (unique)

2. **Customer Model**
   - Name, phone, email
   - Vehicles array (references)
   - Visit history
   - Total visits count

3. **Technician Model**
   - Name, phone
   - Specialty
   - Active jobs, completed jobs
   - Rating

4. **Service Model**
   - Name, category
   - Price, duration

5. **Conversation Model** (for AI)
   - Session ID
   - Messages array
   - Timestamps

### Phase 2: API Endpoints
- Implement all CRUD operations
- Add proper error handling
- Validation using Pydantic

### Phase 3: Claude AI Integration
- Use Emergent LLM Key
- Implement chat conversation history
- Context-aware responses for auto repair

### Phase 4: Frontend Integration
- Create API service layer in frontend
- Replace all mock data imports
- Add loading states
- Error handling and toast notifications
- Form validation

### Phase 5: WhatsApp Integration (Future)
- Set up Twilio/WhatsApp Business API
- Automated notifications on status change
- Send tracking links

---

## Environment Variables Needed

### Backend (.env)
```
MONGO_URL=already_configured
DB_NAME=workshop_db
EMERGENT_LLM_KEY=will_be_fetched
WHATSAPP_API_KEY=future
```

---

## Notes
- Frontend uses RTL (Right-to-Left) for Arabic
- All dates should be formatted for Arabic locale
- Mock data provides realistic Saudi Arabian context
- Tracking links format: TRK-XXX (unique)
