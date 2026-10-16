# LIBNEXA RESTful API Specification

**Base URL**: `http://localhost:5000/api/v1`  
**Interactive Swagger UI**: `http://localhost:5000/api/docs`  
**Authentication**: HTTP Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register/student`
Registers a new university student account.
- **Request Body**:
  ```json
  {
    "fullName": "Halima Sani",
    "email": "halima.sani@nsuk.edu.ng",
    "password": "StrongPassword2026!",
    "matricNumber": "NSUK/NAS/CSC/23/0481",
    "department": "Computer Science",
    "faculty": "Faculty of Natural & Applied Sciences",
    "phone": "+234 803 123 4567"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "fullName": "Halima Sani", "role": "STUDENT" },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

### `POST /auth/login`
Authenticates a user via campus email or matriculation/membership number.
- **Request Body**:
  ```json
  {
    "identifier": "student@nsuk.edu.ng",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "email": "student@nsuk.edu.ng", "role": "STUDENT" },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

### `GET /auth/me`
Retrieves the authenticated user's profile and active role permissions.
- **Headers**: `Authorization: Bearer <TOKEN>`

---

## 2. Catalogue & Physical Copies (`/api/v1/books` & `/api/v1/copies`)

### `GET /books`
Searches books with filtering by category, search query, and availability status.
- **Query Parameters**:
  - `search` (string): Keyword matching title, author, or ISBN.
  - `categoryId` (string): Filter by category identifier.
  - `availableOnly` (boolean): If `true`, returns only books with at least 1 copy in `AVAILABLE` status.
  - `page` (number, default: 1)
  - `limit` (number, default: 20)

### `GET /books/:id`
Retrieves full book details, including authors, categories, publication info, and a breakdown of all individual physical copies.

### `POST /copies` *(Librarian / Admin)*
Adds a new physical copy to an existing title.
- **Request Body**:
  ```json
  {
    "bookId": "uuid-book-id",
    "accessionNumber": "NSUK-LIB-2026-0042",
    "barcode": "9780134610993-01",
    "shelfLocation": "Science Wing, Stack B, Shelf 4",
    "condition": "NEW",
    "status": "AVAILABLE"
  }
  ```

---

## 3. Borrowing & Circulation Workflow (`/api/v1/borrow` & `/api/v1/returns`)

### `POST /borrow/request` *(Student)*
Initiates a loan request for a specific book title.
- **Request Body**: `{ "bookId": "uuid-book-id" }`

### `POST /borrow/review` *(Librarian / Admin)*
Reviews a pending borrow request, assigning an available physical copy upon approval.
- **Request Body**:
  ```json
  {
    "requestId": "uuid-request-id",
    "decision": "APPROVE", // or "REJECT"
    "assignedCopyId": "uuid-copy-id" // optional; auto-assigned if omitted
  }
  ```

### `POST /borrow/collect` *(Librarian / Admin)*
Confirms the student has collected the physical copy at the circulation desk, officially creating the active loan.
- **Request Body**: `{ "requestId": "uuid-request-id" }`

### `POST /returns` *(Librarian / Admin)*
Processes the physical return of a borrowed book.
- **Request Body**:
  ```json
  {
    "loanId": "uuid-loan-id",
    "condition": "GOOD",
    "notes": "Returned on time with minimal shelf wear"
  }
  ```

---

## 4. Reservations & Waitlists (`/api/v1/reservations`)

### `POST /reservations` *(Student)*
Places a reservation on a title whose physical copies are currently exhausted.
- **Request Body**: `{ "bookId": "uuid-book-id" }`
- **Behavior**: Places student into a first-come, first-served queue (`QUEUED`).

### `DELETE /reservations/:id` *(Student / Admin)*
Cancels an active or queued reservation.

---

## 5. Loan Renewals (`/api/v1/renewals`)

### `POST /renewals/request` *(Student)*
Requests an extension of an active loan's due date.
- **Request Body**:
  ```json
  {
    "loanId": "uuid-loan-id",
    "reason": "Preparing for final semester examination"
  }
  ```

### `POST /renewals/review` *(Librarian / Admin)*
Approves or rejects a loan extension request.
- **Request Body**:
  ```json
  {
    "renewalId": "uuid-renewal-id",
    "decision": "APPROVE"
  }
  ```

---

## 6. Administration & Policies (`/api/v1/admin`)

### `GET /admin/settings` *(Admin)*
Fetches all active library circulation policies and parameters.

### `PUT /admin/settings` *(Admin)*
Updates library circulation policies:
```json
{
  "loan_duration_days": "14",
  "overdue_fine_daily_rate": "100",
  "max_books_per_student": "3",
  "max_renewals_per_loan": "2",
  "renewal_extension_days": "7"
}
```

### `GET /admin/users` *(Admin)*
Retrieves all registered students and library personnel with pagination and status filters.

### `PATCH /admin/users/:id/status` *(Admin)*
Updates user account status (`ACTIVE`, `SUSPENDED`, `INACTIVE`).
