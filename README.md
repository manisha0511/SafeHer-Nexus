# SafeHer Nexus

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React Native](https://img.shields.io/badge/React%20Native-0.76.7-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-52-black.svg)](https://expo.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**SafeHer Nexus** is an enterprise-grade women's personal safety platform engineered with a layered, secure **Java 21 + Spring Boot 3.4** backend and a high-performance **React Native + Expo SDK 52 + TypeScript** mobile application.

The platform provides end-to-end personal safety features including a 2-step confirmed SOS distress workflow, continuous live GPS breadcrumb telemetry, safe route recommendations via arterial transit corridors, a grounded AI safety assistant with instant emergency intent overrides, a simulated incoming fake call escape tool, and a safety guidance knowledge hub with direct verified helpline dialers.

---

## 1. Monorepo Repository Structure

```text
SafeHer-Nexus/
├── .gitignore                          # Monorepo-wide security exclusions (secrets, keystores, binaries)
├── README.md                           # Comprehensive platform documentation and deployment guide
├── SafeHer-Nexus-App/                  # React Native mobile application
│   ├── android/                        # Android native project configuration & Gradle scripts
│   ├── assets/                         # Application icons, splash screens, and images
│   ├── src/                            # TypeScript source code (screens, navigation, services)
│   ├── .env.example                    # Mobile environment variable template
│   ├── .gitignore                      # Mobile-specific exclusions
│   ├── app.json                        # Expo app configuration (permissions, scheme, version)
│   ├── eas.json                        # Expo Application Services build profiles (preview, prod)
│   ├── package.json                    # Node.js dependencies and scripts
│   └── tsconfig.json                   # Strict TypeScript compiler options
├── SafeHer-Nexus-Backend/              # Spring Boot REST API
│   ├── scripts/                        # Database backup, restore, and Nginx reverse proxy configs
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/safeher/backend/ # Controllers, services, repositories, entities, security
│   │   │   └── resources/              # application.yml, application-prod.yml, schema-mysql-reference.sql
│   │   └── test/                       # 64 unit and integration test suites
│   ├── .env.example                    # Backend environment variable template
│   ├── .gitignore                      # Backend-specific exclusions
│   └── pom.xml                         # Maven project dependencies and build configuration
└── docs/                               # Phase verification and security audit reports
    ├── PHASE-4-REAL-DEVICE-TESTING.md
    ├── PHASE-5-TWILIO-AI-INTEGRATION.md
    ├── PHASE-6-SECURITY-PERFORMANCE-AUDIT.md
    ├── PHASE-7-ANDROID-RELEASE.md
    ├── PHASE-8-ANDROID-DEVICE-TESTING.md
    ├── PHASE-10-PRODUCTION-SECURITY.md
    └── PHASE-11-PRODUCTION-END-TO-END-TESTING.md
```

---

## 2. Technology Stack & System Architecture

### Mobile Architecture (`SafeHer-Nexus-App`)
- **Framework:** React Native 0.76.7 with Expo SDK 52
- **Language:** TypeScript 5.3 (Strict Mode)
- **Navigation:** React Navigation 6 (Stack + Native Stack)
- **Local Storage:** `expo-secure-store` (Hardware-backed encrypted key-value storage for JWT tokens)
- **Location Services:** `expo-location` (Foreground GPS snapshots & background tracking permissions)
- **Sensors & Haptics:** `expo-haptics` (Tactile feedback on emergency button trigger and fake call ringing)
- **Audio Feedback:** `expo-av` (Simulated ringtone loop for escape caller)

### Backend Architecture (`SafeHer-Nexus-Backend`)
- **Runtime:** Java 21 LTS (Temurin / OpenJDK)
- **Framework:** Spring Boot 3.4.4
- **Security:** Spring Security 6 with stateless JWT authentication filter (`OncePerRequestFilter`)
- **Password Encryption:** BCrypt with standard 10-round salting
- **Data Persistence:** Spring Data JPA / Hibernate with MySQL 8.0 Dialect
- **Connection Pooling:** HikariCP (`SafeHerHikariProdPool` with 20 max connections, connection timeout, and health checks)
- **Rate Limiting:** Bucket4j token bucket rate limiter (15 requests/minute per authenticated user)
- **External Routing:** Open Source Routing Machine (OSRM) with geometric fallback

```
+-------------------------------------------------------------+
|               SafeHer Nexus Mobile Client                  |
|    (React Native + Expo SDK 52 + expo-secure-store)        |
+------------------------------+------------------------------+
                               |
                               | HTTPS / TLS 1.3 (Port 8443 or 443)
                               v
+-------------------------------------------------------------+
|                Spring Boot 3.4.4 Backend                    |
|    - SecurityConfig (HSTS, nosniff, DENY, Permissions)      |
|    - JwtAuthenticationFilter (HMAC-SHA256 Token Validator)  |
|    - Rate Limiter (Bucket4j - 15 req/min)                   |
+---------------+--------------+---------------+--------------+
                |              |               |
                v              v               v
    +-------------------+ +------------+ +--------------------+
    | MySQL 8.0 Database| | OSRM Engine| | External Services  |
    | (safeher_nexus_db)| | (Corridors)| | - Twilio SMS (Safe)|
    | Least-Privilege   | +------------+ | - Gemini AI (Safe) |
    | safeher_app_user  |                +--------------------+
    +-------------------+
```

---

## 3. Core Safety Features

### 1. Two-Step SOS Emergency Distress Workflow
- **Distress Activation:** 2-step confirmed press triggers an active emergency event (`POST /api/emergency-events`).
- **Duplicate Prevention:** Server-side conflict detection returns `HTTP 409 Conflict` if an SOS event is already active, preventing duplicate database records.
- **Continuous GPS Telemetry:** Emits periodic breadcrumb coordinates (`POST /api/emergency-events/{id}/locations`) every 15 seconds.
- **Audit History:** Full incident history with recorded GPS breadcrumbs, timestamps, and resolution statuses.

### 2. Smart Safe Route Recommendations
- **Arterial Corridor Prioritization:** Evaluates routes along well-lit, multi-lane arterial avenues (e.g., 100 Feet Road corridor) rather than isolated backalleys.
- **Data Integrity Rule:** Prohibits fabricating fictitious crime scores or fake safety ratings. Results are clearly designated as route recommendations based on road classification.
- **Navigation Deep Link:** Generates direct Google Maps deep links for turn-by-turn routing.

### 3. AI Safety Assistant with Emergency Intent Override
- **Grounding & Fallback:** Answers informational safety questions using a verified offline knowledge base (`VERIFIED_KNOWLEDGE_BASE_FALLBACK`).
- **Emergency Keyword Detection:** If urgent distress terms are typed (*"help me"*, *"being followed"*, *"attacker"*), the server immediately overrides normal chat and returns an emergency distress response (`isEmergency: true`, response time ~16.9 ms) directing the user to dial national helplines (`112`, `1091`) or activate SOS.
- **Abuse Prevention:** Protected by a sliding-window rate limiter (15 queries/minute).

### 4. Fake Call Escape Simulator
- **Customizable Incoming Call:** Simulates realistic phone rings from customizable contacts (e.g. "Mom", "Police") with customizable delays (10s, 30s, 1m, 5m).
- **Interactive Call Screen:** Full-screen incoming call UI with Accept/Decline actions, active call duration timer, and haptic vibration feedback.
- **Safety Disclaimer:** Prominently states that the fake call is a personal escape simulation and does not place actual telephony calls.

### 5. Safety Guidance Knowledge Hub & Helplines
- **Verified Indian National Helplines:** Immediate access to official emergency numbers (`112` Emergency, `1091` Women Helpline, `1090` Women Power Line, `181` Domestic Abuse, `1930` Cyber Crime).
- **Categorized Advice:** Verified precautions for transit, commute, night travel, and digital privacy.

---

## 4. Security & Production Hardening

- **Dedicated Database & Least-Privilege User:** Operates strictly on `safeher_nexus_db` using dedicated MySQL user `safeher_app_user` with DML grants only (`SELECT, INSERT, UPDATE, DELETE, REFERENCES`). DDL alterations and access to legacy databases (`safeher`, `safeher_db`) are blocked at the database privilege level.
- **Strict Schema Governance:** `ddl-auto: validate` ensures Hibernate never modifies database schemas at startup.
- **Encrypted Password Storage:** All passwords stored strictly as salted BCrypt hashes (`$2a$10$...`). Zero plaintext passwords in logs or responses.
- **Stateless JWT Authorization:** HMAC-SHA256 tokens with 24-hour expiration (`86,400,000 ms`). Protected endpoints require `Bearer <token>`.
- **Cross-User Data Isolation:** Users cannot read or manipulate another user's profile, emergency contacts, or SOS incidents.
- **Production HTTPS Security Headers:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- **Backup & Disaster Recovery:**
  - `backup-database.ps1`: Automated transaction-safe `mysqldump` with 14-day retention.
  - `restore-database.ps1`: Guarded restore script blocking accidental operations on legacy databases.

---

## 5. Local Setup & Configuration

### Prerequisites
- **JDK 21** (Eclipse Temurin or OpenJDK 21)
- **Apache Maven 3.9+**
- **Node.js 20+** and **npm 10+**
- **MySQL Server 8.0+**
- **Android Studio** (for Android Emulator testing) or **Expo Go / ADB**

### 1. Database Setup (MySQL 8)
Log in to MySQL as root and execute:
```sql
CREATE DATABASE IF NOT EXISTS safeher_nexus_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'safeher_app_user'@'localhost' IDENTIFIED BY 'YourStrongPasswordHere!';
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON safeher_nexus_db.* TO 'safeher_app_user'@'localhost';
FLUSH PRIVILEGES;
```
Initialize the schema using the non-destructive reference DDL:
```bash
# Path: SafeHer-Nexus-Backend/src/main/resources/db/schema-mysql-reference.sql
mysql -u safeher_app_user -p safeher_nexus_db < SafeHer-Nexus-Backend/src/main/resources/db/schema-mysql-reference.sql
```

### 2. Backend Configuration (`SafeHer-Nexus-Backend`)
Copy the environment template:
```bash
cd SafeHer-Nexus-Backend
cp .env.example .env
```
Set the runtime environment variables:
```env
SERVER_PORT=8080
DB_URL=jdbc:mysql://localhost:3306/safeher_nexus_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=safeher_app_user
DB_PASSWORD=YourStrongPasswordHere!
DB_DDL_AUTO=validate
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
SSL_ENABLED=false
```
Build and run the Spring Boot application:
```bash
mvn clean package -DskipTests
mvn spring-boot:run
```

### 3. Mobile Application Configuration (`SafeHer-Nexus-App`)
Copy the mobile environment template:
```bash
cd SafeHer-Nexus-App
cp .env.example .env
```
Configure `EXPO_PUBLIC_API_BASE_URL`:
- For **Android Studio Emulator**:
  ```env
  EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
  ```
- For **Physical Device over Wi-Fi**:
  ```env
  EXPO_PUBLIC_API_BASE_URL=http://<YOUR_PC_LAN_IPV4>:8080
  ```
Install dependencies and launch the app:
```bash
npm install
npx expo start
```

---

## 6. Testing & Quality Verification

### Run Backend Unit & Integration Tests (64 Tests)
```bash
cd SafeHer-Nexus-Backend
mvn test
```
*Expected Result:* `Tests run: 64, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).

### Run Mobile TypeScript Typecheck
```bash
cd SafeHer-Nexus-App
npm run typecheck
```
*Expected Result:* Exits with code 0 (`0 errors`).

---

## 7. Known Limitations & Current Status

In strict adherence to truth-in-reporting and safety governance:

1. **Background Location Tracking on Physical Devices:**
   - **Status:** **`NOT TESTED`**
   - **Detail:** Continuous foreground GPS telemetry during active SOS has been verified on the Android 15 emulator. Background location delivery when the screen is locked or the app is minimized requires real-world physical Android device testing with GPS sensors and device-specific battery management overrides.
2. **Twilio SMS Notifications:**
   - **Status:** **`DISABLED - CREDENTIALS REQUIRED`**
   - **Detail:** Twilio SMS operates in Safe Mode (`NOT_CONFIGURED`). Notification database records are created and audited, but real SMS messages are not dispatched until live `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are provided.
3. **Cloud LLM External AI:**
   - **Status:** **`DISABLED - CREDENTIALS REQUIRED`**
   - **Detail:** The AI Assistant currently serves all safety inquiries through its verified offline knowledge base fallback. Cloud generative reasoning will activate once a live `GEMINI_API_KEY` is configured.
4. **Standalone Preview APK vs. Google Play AAB:**
   - The compiled preview APK (`app-release.apk`) on disk is configured for local network testing. Submitting to Google Play requires building a production Android App Bundle (`app-release.aab`) with `usesCleartextTraffic: false` pointing to a verified public HTTPS domain.

---

## 8. License

Proprietary — All rights reserved. Developed for SafeHer Nexus.
