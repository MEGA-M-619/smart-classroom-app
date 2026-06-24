# SmartClass

SmartClass is a React + Vite LMS frontend backed by a Java 21 Spring Boot REST API and MySQL 8. The UI keeps the existing SaaS classroom design while all authentication and data access now flow through the backend API.

## Stack

- Frontend: React 19, Vite, Axios
- Backend: Java 21, Spring Boot 3, Maven
- API: Spring Web REST controllers
- Persistence: Spring Data JPA, MySQL Connector/J
- Security: Spring Security, JWT, BCrypt password hashing
- Database: MySQL 8

## Project Structure

```text
backend/
  src/main/java/com/smartclassroom/
    config/       Security, CORS, static upload config
    controller/   REST endpoints
    dto/          Request/response DTOs with validation
    entity/       JPA entities
    exception/    Global exception handling
    repository/   Spring Data repositories
    security/     JWT and current-user helpers
    service/      Business logic
database/
  schema.sql      MySQL schema for local setup
src/
  api.js          Axios API client and JWT persistence
  AppContext.jsx  Protected app state wired to REST API
  SmartClassroomApp.jsx
```

## Environment Variables

Frontend `.env` or `.env.local`:

```bash
VITE_APP_NAME=SmartClass
VITE_API_BASE_URL=http://localhost:8080/api
VITE_ANALYTICS_ID=
```

Backend `backend/src/main/resources/application.properties` defaults:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/smart_classroom
spring.datasource.username=root
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
app.jwt.secret=change-this-development-secret-change-this-development-secret
```

For production, override `JWT_SECRET`, `JWT_EXPIRATION_MS`, `CORS_ALLOWED_ORIGINS`, and database credentials through environment variables or your deployment platform.

## REST API

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Users:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

Classes:

- `GET /api/classes`
- `POST /api/classes`
- `POST /api/classes/join`
- `GET /api/classes/{id}`
- `DELETE /api/classes/{id}`

Assignments:

- `GET /api/assignments`
- `POST /api/assignments`
- `PUT /api/assignments/{id}`
- `DELETE /api/assignments/{id}`

Submissions:

- `GET /api/submissions`
- `POST /api/submissions`
- `PUT /api/submissions/{id}/grade`

Dashboard compatibility:

- `GET /api/dashboard/bootstrap`
- `GET /api/announcements`
- `POST /api/announcements`
- `GET /api/notifications`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`
- `POST /api/files`

## Run Locally

1. Start MySQL 8 and create the database:

```bash
mysql -u root -p < database/schema.sql
```

2. Start the backend:

```bash
cd backend
mvn spring-boot:run
```

The backend runs at `http://localhost:8080`.

3. Start the frontend:

```bash
npm install
npm run dev
```

The frontend usually runs at `http://localhost:5173`.

4. Register users from the app. Choose `Student` or `Teacher` during signup. To create an admin, update the user role in MySQL:

```sql
update users set role = 'ADMIN' where email = 'admin@example.com';
```

## Verification

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
cd backend
mvn test
```

## Notes

- JWTs are stored in `localStorage` under `smartclass_token`.
- Frontend API calls attach `Authorization: Bearer <token>` automatically.
- Uploaded files are stored in the backend `uploads/` folder and served from `/uploads/**`.
- `spring.jpa.hibernate.ddl-auto=update` is convenient for local MVP work. For production, replace it with versioned migrations such as Flyway or Liquibase.
