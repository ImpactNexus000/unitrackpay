# UniTrackPay — Full Product & System Specification

> Project by: Chigboo Mbonu  
> University of Hertfordshire · MSc Molecular Biotechnology  
> Purpose: Help UH students track tuition, accommodation, and fee payments with admin verification

---

## 1. Problem Statement

There is no official system for students to track their payments at the University of Hertfordshire. Students currently:
- Make payments and manually track them
- Email the finance department to confirm balances
- Experience long delays getting responses
- Have no real-time visibility into what they owe or have paid

---

## 2. Goal

Build a simple but scalable MVP web application that allows students to:
- Track all payments they've made
- Upload proof of payment (receipts, screenshots)
- See an estimated remaining balance
- View a clear payment history timeline
- Receive updates when payments are confirmed or rejected
- Reduce dependency on emailing finance teams

---

## 3. User Roles

| Role | Description |
|---|---|
| Student | Logs payments, uploads receipts, views own balance and history |
| Finance Admin | Reviews submission queue, confirms or rejects entries, adds notes |
| Super Admin | (Post-MVP) Manages student records, fee structures, admin accounts |

---

## 4. Core MVP Features

- Student auth (register with student ID + university email)
- Payment logging form (type, amount, date, method, reference number)
- Receipt upload (image or PDF)
- Estimated balance view (total owed minus confirmed payments)
- Payment history table (filterable by status and type)
- Admin review queue (confirm / reject with notes)
- Email notification on payment status change
- In-app notifications (unread badge)

**Deliberately excluded from MVP:** bank API integration, automatic reconciliation, direct SIS sync

---

## 5. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Vite | Fast, familiar |
| Backend API | FastAPI (Python) | Already in Chigboo's stack |
| Database | PostgreSQL (via Supabase) | Relational integrity for financial data |
| ORM | SQLAlchemy + Alembic | Migrations, type safety |
| Auth | JWT (access 15min, refresh 7d) | Already familiar |
| File storage | Cloudinary | Free 25GB, simple Python SDK |
| Email | Resend | Free 3,000/month |
| Deployment (FE) | Vercel | Auto-deploy from GitHub main |
| Deployment (BE) | Render | Free tier, upgrade at $7/mo |

> Do NOT use MongoDB. PostgreSQL is required — financial records need relational integrity.

---

## 6. Folder Structure

```
unitrackpay/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── payment.py
│   │   ├── fee_item.py
│   │   ├── review.py
│   │   └── notification.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── payments.py
│   │   ├── fees.py
│   │   ├── admin.py
│   │   └── notifications.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── payment.py
│   │   └── fee_item.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── balance.py
│   │   ├── upload.py
│   │   └── email.py
│   ├── dependencies.py       # JWT auth + role guards
│   ├── config.py             # env vars
│   └── alembic/              # migrations
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LogPayment.jsx
│   │   │   ├── PaymentHistory.jsx
│   │   │   ├── Receipts.jsx
│   │   │   └── AdminQueue.jsx
│   │   ├── components/
│   │   │   ├── BalanceBar.jsx
│   │   │   ├── PaymentTable.jsx
│   │   │   ├── Timeline.jsx
│   │   │   ├── UploadZone.jsx
│   │   │   └── NotificationBadge.jsx
│   │   ├── api/              # axios calls
│   │   ├── context/          # AuthContext
│   │   └── App.jsx
│   └── vite.config.js
├── SPEC.md                   # this file
├── .env.example
└── README.md
```

---

## 7. Database Schema

```sql
-- Users (students + admins)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    VARCHAR(20) UNIQUE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'student',  -- student | admin | super_admin
  programme     VARCHAR(255),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fee schedules (what a student owes — set by admin)
CREATE TABLE fee_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  description   VARCHAR(255),
  amount_due    NUMERIC(10,2) NOT NULL,
  due_date      DATE,
  category      VARCHAR(50),   -- tuition | accommodation | lab | library | other
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Payment submissions (student logs these)
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  fee_item_id     UUID REFERENCES fee_items(id) ON DELETE SET NULL,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_method  VARCHAR(50),  -- bank_transfer | card | online_portal | cash
  reference       VARCHAR(255),
  notes           TEXT,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending | confirmed | rejected
  receipt_url     TEXT,         -- Cloudinary URL
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Admin review audit trail
CREATE TABLE payment_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID REFERENCES payments(id) ON DELETE CASCADE,
  admin_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(20),   -- confirmed | rejected
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Balance Calculation Logic

> Never store balance as a column. Always compute on read to avoid drift.

```python
def get_student_balance(user_id: UUID, db: Session) -> dict:
    total_owed = db.query(func.sum(FeeItem.amount_due))\
        .filter(FeeItem.user_id == user_id).scalar() or 0

    total_confirmed = db.query(func.sum(Payment.amount))\
        .filter(
            Payment.user_id == user_id,
            Payment.status == 'confirmed'
        ).scalar() or 0

    total_pending = db.query(func.sum(Payment.amount))\
        .filter(
            Payment.user_id == user_id,
            Payment.status == 'pending'
        ).scalar() or 0

    return {
        "total_owed": float(total_owed),
        "total_confirmed": float(total_confirmed),
        "total_pending": float(total_pending),
        "remaining": float(total_owed - total_confirmed),
        "progress_pct": round((total_confirmed / total_owed) * 100, 1) if total_owed else 0
    }
```

---

## 9. API Endpoints

### Auth
```
POST   /api/auth/register         {student_id, email, full_name, password, programme}
POST   /api/auth/login            {email, password} → {access_token, refresh_token}
POST   /api/auth/refresh          {refresh_token} → {access_token}
POST   /api/auth/logout
```

### Student — Dashboard & Balance
```
GET    /api/me/dashboard          → {student, balance, next_due, recent_payments}
GET    /api/me/fees               → list of fee_items for this student
```

### Student — Payments
```
GET    /api/me/payments           ?status=&type=&page=&limit=
POST   /api/me/payments           {fee_item_id?, amount, payment_date, method, reference, notes}
GET    /api/me/payments/{id}
PATCH  /api/me/payments/{id}/receipt   multipart/form-data (file)
```

### Student — Notifications
```
GET    /api/me/notifications      → unread first
PATCH  /api/me/notifications/read {ids: [...]}
```

### Admin
```
GET    /api/admin/queue           → pending payments, paginated
PATCH  /api/admin/payments/{id}   {action: "confirmed"|"rejected", note}
GET    /api/admin/students        → all students + balance summary
GET    /api/admin/students/{id}   → student detail + full payment history
POST   /api/admin/fees            {user_id, description, amount_due, due_date, category}
DELETE /api/admin/fees/{id}
GET    /api/admin/reports         ?month=&type= → aggregated totals
```

### Example response — GET /api/me/dashboard
```json
{
  "student": {
    "id": "uuid",
    "student_id": "22048201",
    "name": "Chigboo Obi",
    "programme": "MSc Molecular Biotechnology"
  },
  "balance": {
    "total_owed": 9250.00,
    "total_confirmed": 5750.00,
    "total_pending": 1200.00,
    "remaining": 3500.00,
    "progress_pct": 62.2
  },
  "next_due": {
    "description": "Tuition Semester 3",
    "amount": 1750.00,
    "due_date": "2025-05-01"
  },
  "recent_payments": [
    {
      "id": "uuid",
      "description": "Tuition top-up",
      "amount": 1200.00,
      "status": "pending",
      "submitted_at": "2025-04-04T10:23:00Z"
    }
  ]
}
```

---

## 10. Security Requirements

- JWT: access token 15min expiry, refresh token 7 days
- Role-based guards on all admin routes — FastAPI dependency checking `user.role == 'admin'`
- Row-level isolation — every student query must filter by `user_id == current_user.id`
- Receipt uploads: validate MIME type server-side using `python-magic` (not just Content-Type header). Allow only: `image/jpeg`, `image/png`, `application/pdf`. Max 10MB.
- Rate limiting on `/api/auth/login` using `slowapi`
- All secrets in environment variables — never hardcoded
- HTTPS enforced in production
- `payment_reviews` table must log every admin action (audit trail — do not skip this)

---

## 11. Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=
FROM_EMAIL=noreply@unitrackpay.com

FRONTEND_URL=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

---

## 12. Notification Triggers

Send email + in-app notification when:
- Payment status changes to `confirmed`
- Payment status changes to `rejected` (include admin's note in the message)
- A new fee item is added to the student's account
- Payment is approaching due date (3 days before — post-MVP cron job)

---

## 13. Receipt Upload Flow

1. Student submits payment form
2. Frontend sends file to `PATCH /api/me/payments/{id}/receipt`
3. Backend validates MIME type with `python-magic`
4. If valid → upload to Cloudinary, store URL in `payments.receipt_url`
5. If invalid → return 400 with clear error message
6. Cloudinary folder structure: `unitrackpay/receipts/{user_id}/{payment_id}`

---

## 14. UI Screens

### Student
1. **Dashboard** — balance summary cards, progress bar, recent payments, timeline
2. **Log Payment** — form (type, amount, date, method, reference) + receipt upload zone + "what happens next" panel
3. **Payment History** — filterable table (status, type, date range) + export CSV
4. **Receipts** — gallery of uploaded receipt files
5. **Notifications** — list of status updates

### Admin
1. **Review Queue** — cards for each pending submission with confirm/reject buttons
2. **All Students** — table with balance summary per student
3. **Student Detail** — full payment history for one student
4. **Reports** — monthly totals by payment type

### Mobile
- Bottom navigation: Home | Log | History | Receipts | Profile
- Balance card prominently at the top of dashboard
- Quick action buttons (Log payment, My receipts, History, Settings)

---

## 15. Build Order (solo developer)

Build in this exact sequence — always have something working:

| Day | Task |
|---|---|
| 1 | FastAPI project scaffold, database connection, SQLAlchemy models, Alembic migrations |
| 2 | Auth endpoints (register, login, JWT), dependency guards |
| 3 | Fee items endpoints + balance calculation endpoint |
| 4 | Payment log form (frontend) + POST /api/me/payments |
| 5 | Payment history table (frontend) + GET /api/me/payments |
| 6 | Cloudinary receipt upload integration |
| 7 | Admin review queue + confirm/reject endpoints |
| 8 | Email notifications via Resend on status change |
| 9 | Polish dashboard UI, in-app notifications |
| 10 | Deploy: Supabase (DB) + Render (API) + Vercel (FE) |

---

## 16. Deployment

| Layer | Service | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Render | Free (upgrade $7/mo for always-on) |
| Database | Supabase | Free up to 500MB |
| File storage | Cloudinary | Free up to 25GB |
| Email | Resend | Free 3,000/month |

**CI/CD:**
- GitHub Actions: run `pytest` on every push to any branch
- On merge to `main`: auto-deploy backend to Render, frontend auto-deploys via Vercel GitHub integration

---

## 17. Post-MVP Roadmap

**Phase 2**
- Open banking integration (TrueLayer) — auto-pull bank transactions, eliminate manual receipt uploads
- SIS webhook — auto-import fee schedules per student from university system

**Phase 3**
- Multi-tenant — each university gets its own subdomain + admin space
- Sell as SaaS to other UK universities

**Phase 4**
- In-app payment initiation via Stripe
- Automated instalment plans with tracking
- HMO / sponsor payment tracking for international students

---

## 18. Detailed UI Component Specification

> Use Tailwind CSS for all styling. The design is flat, clean, and minimal — no gradients, no heavy shadows. Use `gray-50` backgrounds, `gray-200` borders, clean white cards.

---

### 18.1 Global Layout — Desktop (authenticated)

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (w-48, bg-gray-50, border-r)  │  MAIN CONTENT  │
│                                        │                 │
│  Logo: "UniTrackPay"                   │  Page title     │
│  Subtitle: university name             │  Page subtitle  │
│                                        │                 │
│  Nav items (vertical list):            │  [page content] │
│  • Overview (active = border-l-2)      │                 │
│  • Log Payment                         │                 │
│  • Payment History                     │                 │
│  • Receipts                            │                 │
│  • Settings (pinned to bottom)         │                 │
└─────────────────────────────────────────────────────────┘
```

- Active nav item: `border-l-2 border-gray-900 bg-white font-medium text-gray-900`
- Inactive nav item: `text-gray-500 hover:text-gray-700`
- Each nav item has a small filled dot (6px circle) as icon prefix
- Top-right of main content: notification bell with red dot badge + user avatar (initials circle, bg-blue-100, text-blue-700)

---

### 18.2 Global Layout — Mobile

```
┌──────────────────────────┐
│  TOP BAR                 │
│  "UniTrackPay"  🔔  [CO] │
├──────────────────────────┤
│                          │
│  [page content]          │
│                          │
├──────────────────────────┤
│  BOTTOM NAV              │
│  🏠   📋   📊   📂   👤  │
│ Home  Log  Hist  Rec  Me │
└──────────────────────────┘
```

- Bottom nav: 5 items, active item has `font-medium text-gray-900`, inactive is `text-gray-400`
- Top bar: `flex justify-between items-center px-4 py-3 border-b`

---

### 18.3 Page: Student Dashboard

**Metric cards row** — 4 cards in a `grid grid-cols-4 gap-3` (collapses to `grid-cols-2` on mobile):

| Card | Value style | Label |
|---|---|---|
| Total owed | `text-red-600 text-xl font-medium` | "Total owed" |
| Total paid | `text-green-600 text-xl font-medium` | "Total paid" |
| Remaining | `text-blue-600 text-xl font-medium` | "Remaining" |
| Pending review | `text-amber-500 text-xl font-medium` | "Pending review" |

Each card: `bg-gray-50 rounded-lg p-4`, label is `text-xs text-gray-400 mb-1`.

**Payment progress bar** — full-width panel below metric cards:
- Container: `border border-gray-200 rounded-xl p-4 bg-white`
- Label row: `flex justify-between` — left: "Payment progress", right: "62% complete" in `text-xs text-gray-400`
- Track: `h-2 bg-gray-100 rounded-full` with inner fill `bg-green-500 rounded-full` at computed width %
- Below track: three labels — `£0` left, `Next due: {date} · £{amount}` center, `£{total}` right, all `text-xs text-gray-400`

**Two-column lower section** — `grid grid-cols-2 gap-4` (stacks on mobile):

Left — Recent payments table:
- Section header: `flex justify-between items-center mb-3` with "Recent payments" (`text-sm font-medium`) and "View all" button (`text-xs border rounded-lg px-3 py-1`)
- Table: `w-full text-xs`, columns: Description | Amount | Status
- Table header: `text-gray-400 text-xs font-medium border-b pb-2`
- Each row: `border-b py-2`, first cell `font-medium text-gray-900`, other cells `text-gray-500`
- Status badges (see badge spec below)
- Below table: dashed "+" button — `w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 text-center`

Right — Timeline:
- Section header: "Timeline" `text-sm font-medium mb-3`
- Each timeline item is a 3-column grid: `[date col 80px] [line col 1px] [content col 1fr]`
- Date: `text-xs text-gray-400 text-right pt-0.5`
- Line column: dot (8px circle, `bg-green-500` confirmed or `bg-amber-400` pending) + vertical connector line (`bg-gray-200 w-px flex-1 min-h-6`)
- Content: title `text-xs font-medium text-gray-900` + detail `text-xs text-gray-400 mt-0.5`

---

### 18.4 Page: Log Payment

Two-column layout — `grid grid-cols-2 gap-4`:

**Left panel — Payment details form:**
- Panel: `border border-gray-200 rounded-xl p-4 bg-white`
- Title: `text-sm font-medium text-gray-900 mb-4`
- Fields: Payment type (select), Amount + Date (2-col row), Payment method (select), Reference/transaction ID (text), Notes (text, optional)
- All inputs: `w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white`
- Labels: `text-xs font-medium text-gray-500 mb-1 block`
- Group spacing: `mb-4`

**Right column — two stacked panels:**

Upload panel:
- Panel: `border border-gray-200 rounded-xl p-4 bg-white mb-4`
- Title: `text-sm font-medium text-gray-900 mb-4`
- Drop zone: `border border-dashed border-gray-300 rounded-xl p-6 text-center`
  - Upload icon: 32px circle `bg-gray-100 flex items-center justify-center mx-auto mb-2`
  - Primary text: `text-xs text-gray-500` — "Drag & drop receipt or screenshot"
  - Hint text: `text-xs text-gray-400 mt-1` — "PNG, JPG, PDF · Max 10MB"
- Browse button below drop zone: full-width, outlined style

"What happens next" panel:
- Same panel style
- Title: `text-sm font-medium text-gray-900 mb-3`
- 3-step mini timeline (same structure as dashboard timeline) with steps: "You submit this form", "Finance reviews (1–3 business days)", "You get notified"

Submit button — full-width below right column:
- `w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg`

---

### 18.5 Page: Payment History

**Filter bar** — `flex gap-2 flex-wrap my-4`:
- Type select, Status select, Reference search input (w-44), Export CSV button
- All inputs same style as form inputs but `text-xs py-1.5`

**Full-width table** — columns: Date | Description | Method | Reference | Amount | Receipt | Status | Verified by
- Table: `w-full text-xs border-collapse`
- Header: `text-gray-400 text-xs font-medium border-b py-2`
- Rows: `border-b py-2`, Date/Description/Amount in `text-gray-900 font-medium`, other cells `text-gray-500`
- Receipt cell: `text-blue-500 cursor-pointer` — "View" link
- Verified by cell: admin name or `—` in `text-gray-400` if not yet verified
- Below table: `text-xs text-gray-400 mt-3` — "Showing X of Y records · Total confirmed: £X"

---

### 18.6 Page: Admin Review Queue

**Metric cards row** — 3 cards: Pending (amber), Confirmed today (green), Total received this month (neutral)

**Two-column lower section:**

Left — Pending submissions queue:
- Each submission is a card: `border border-gray-200 rounded-lg p-4 mb-3 bg-white`
- Card header: `flex justify-between items-center mb-2`
  - Left: student name `text-sm font-medium` + student ID `text-xs text-gray-400 font-normal`
  - Right: Pending badge
- Meta line: `text-xs text-gray-400` — "Payment type · £amount · Submitted {date} · {method} · Ref: {ref}"
- Action buttons row: `flex gap-2 mt-3`
  - "View receipt": `text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg`
  - "Confirm": `text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg font-medium`
  - "Reject": `text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-medium`

Right — Recent activity table:
- Columns: Student | Type | Amount | Action
- Same table style as history page

---

### 18.7 Mobile: Student Dashboard

Balance card (top, prominent):
- `bg-gray-50 rounded-xl p-4 mb-4 text-center`
- Label: `text-xs text-gray-400 mb-1` — "Outstanding balance"
- Value: `text-3xl font-medium text-red-500`
- Sub: `text-xs text-gray-400 mt-1` — "Next payment due: {date}"
- Progress bar below (same style, smaller)
- Under bar: `text-xs text-gray-400 mt-1` — "£X paid of £Y total"

Quick action buttons — `grid grid-cols-2 gap-2 mb-4`:
- Each: `border border-gray-200 rounded-lg p-3 text-center bg-white`
- Icon: emoji, `text-lg mb-1`
- Label: `text-xs font-medium text-gray-500`
- 4 buttons: Log Payment | My Receipts | History | Settings

Recent payments list:
- Section header: `flex justify-between text-xs font-medium text-gray-500 mb-2` with "Recent payments" + "See all" in `text-blue-500`
- Each item: `flex justify-between items-center py-2.5 border-b border-gray-100`
  - Left: name `text-sm font-medium text-gray-900` + date/method `text-xs text-gray-400`
  - Right: amount `text-sm font-medium` + status badge below

---

### 18.8 Status Badge Spec

All badges: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`

| Status | Background | Text color | Tailwind classes |
|---|---|---|---|
| Pending | `bg-amber-50` | `text-amber-600` | `bg-amber-50 text-amber-600` |
| Confirmed | `bg-green-50` | `text-green-700` | `bg-green-50 text-green-700` |
| Rejected | `bg-red-50` | `text-red-600` | `bg-red-50 text-red-600` |

---

### 18.9 Component: BalanceBar

Props: `totalOwed`, `totalConfirmed`, `nextDue`

```jsx
// Renders:
// - Label row: "Payment progress" + "X% complete"
// - Track div with dynamic fill width = (totalConfirmed / totalOwed) * 100 + "%"
// - Footer labels: £0 | Next due: {nextDue.date} · £{nextDue.amount} | £{totalOwed}
// Fill color: bg-green-500
// Track color: bg-gray-100
```

---

### 18.10 Component: UploadZone

Props: `onFileSelect`, `accept`, `maxSizeMB`

Behaviour:
- Default state: dashed border, upload icon, primary + hint text, browse button
- Drag-over state: `border-blue-400 bg-blue-50`
- File selected state: show filename + file size + remove (×) button
- Validates file type and size client-side before sending to API; shows inline error if invalid

---

### 18.11 Component: Timeline

Props: `items: [{date, title, detail, status}]`

- Status `confirmed` → green dot
- Status `pending` → amber dot
- Last item has no connector line below it
- Date column is right-aligned, 80px fixed width
- Connector line does not render below the last item

---

### 18.12 Auth Pages

**Login page** — centered card, max-w-sm, mx-auto, mt-20:
- Logo + app name at top
- Fields: Email, Password
- "Sign in" button: full-width, `bg-gray-900 text-white`
- Link below: "Don't have an account? Register"

**Register page** — same card style:
- Fields: Full name, Student ID, University email, Programme (text), Password, Confirm password
- "Create account" button: full-width
- Link: "Already have an account? Sign in"
- Note below form: `text-xs text-gray-400 text-center` — "Use your University of Hertfordshire email address"

---

*Last updated: April 2025 | Architect: Claude (Anthropic) | Owner: Chigboo Obi*
