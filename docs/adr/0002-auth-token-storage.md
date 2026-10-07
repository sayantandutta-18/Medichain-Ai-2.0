# ADR 0002: Authentication Token Storage & Transport Architecture

## Status
Accepted

## Context
MediChain-AI requires an authentication strategy that provides strong protection for healthcare portfolio data while supporting both browser web clients and automated CLI/API testing. The primary design dilemma is choosing between `httpOnly` secure cookies versus `Authorization: Bearer <token>` HTTP headers.

## Decision Drivers
1. **Protection against Cross-Site Scripting (XSS):** If tokens are accessible via JavaScript (e.g. stored in `localStorage`), any XSS vulnerability allows an attacker to exfiltrate valid credentials.
2. **Protection against Cross-Site Request Forgery (CSRF):** Browsers automatically attach cookies to cross-site requests, requiring CSRF token verification and strict `SameSite` settings.
3. **Multi-client Compatibility:** CLI tools (e.g. `curl`, test scripts, and potential microservices) work cleanly with standard `Bearer` authentication headers.
4. **Token Expiry & Rotation:** Tokens must have short lifespans to limit exposure windows.

## Decision

We adopt a **Dual Token Strategy with In-Memory Access Tokens & Hashed Refresh Token Rotation**:

1. **Short-Lived Access Tokens (15 Minutes):**
   - Transmitted via the `Authorization: Bearer <token>` header.
   - Frontend clients store the access token strictly **in memory** (e.g. React `AuthContext` state) and **never in `localStorage` or `sessionStorage`**.
   - If an XSS vulnerability occurs, an attacker cannot retrieve stored tokens from disk/storage across page sessions.
   - Header transport eliminates CSRF attack vectors since browsers never attach Authorization headers to unauthorized cross-origin requests.

2. **Hashed Refresh Tokens with One-Time Rotation:**
   - Generated as cryptographically random 32-byte strings.
   - Stored in the database **strictly as SHA-256 hashes**.
   - Upon each refresh request (`POST /api/v1/auth/refresh`), the presented token is verified against the hash, revoked immediately, and replaced with a newly generated pair (rotation).
   - `POST /api/v1/auth/logout` explicitly revokes the stored hash, invalidating the session server-side.

3. **Client-Side Storage Boundary (Master Rule 6):**
   - The frontend never serves as the security boundary. Server-side policy checks (`requireAuth`) validate token signature, expiration (`exp`), issuer (`iss`), and audience (`aud`) on every protected request.

## Consequences
- Single-page application reloads request a session restore via the API or refresh mechanism.
- Database compromise does not expose usable refresh tokens due to SHA-256 hashing.
- Both web browsers and developer tools (`curl`, Postman, automated tests) integrate seamlessly with standard HTTP Authorization headers.
