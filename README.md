# 🏥 MediChain AI 2.0

### 🔐 Your Health Records. Your Permission. Verifiable Integrity.

**MediChain AI 2.0** is a privacy-focused healthcare platform that combines Artificial Intelligence, Blockchain, and Cryptography to help patients manage medical records securely, control data access, and verify document integrity.

---

## 🚀 Live Demo

| Service | Link |
|---|---|
| 🌐 **Frontend — Vercel** | [Open MediChain AI 2.0](https://medichain-ai-2-0-7duf.vercel.app/) |
| ⚙️ **Backend API — Render** | [Open Backend API](https://medichain-ai-2-0-2.onrender.com/api/v1) |
| ❤️ **Backend Health Check** | [Check API Readiness](https://medichain-ai-2-0-2.onrender.com/api/v1/health/ready) |
| 💻 **GitHub Repository** | [View Source Code](https://github.com/sayantandutta-18/Medichain-Ai-2.0) |

> **Note:** The backend API base URL may return a 404 at the root because it is an API service. Use the health-check endpoint to check backend readiness.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment Guide](#-deployment-guide)
- [Testing](#-testing)
- [Security](#-security)
- [Future Improvements](#-future-improvements)
- [Disclaimer](#-disclaimer)

---

## 🎯 Overview

Medical records are often scattered across hospitals, laboratories, and healthcare platforms. Patients may have limited visibility into how their information is accessed and shared.

MediChain AI 2.0 explores a patient-centric approach to healthcare data management by combining:

- 🔐 Secure authentication and access control
- 🗂️ Medical record management
- 🔒 Document encryption
- 🧾 Cryptographic integrity verification
- ⛓️ Sui blockchain integration
- 🤖 AI-assisted medical information explanations

### 💡 Our Mission

**To give patients greater control over their medical records while improving privacy, transparency, and data integrity.**

---

## ❗ Problem Statement

Traditional medical record management can present several challenges:

- 🏥 Records are distributed across multiple healthcare providers.
- 🔍 Patients may have limited visibility into access permissions.
- 🔐 Sensitive medical information requires strong protection.
- 🧾 Detecting unauthorised document modifications can be difficult.
- 🩺 Medical terminology may be difficult for patients to understand.

---

## 💎 Our Solution

MediChain AI 2.0 aims to address these challenges through:

- 👤 **Patient-Controlled Access:** Consent-based sharing of supported medical records.
- 🔒 **Encrypted Records:** AES-256-GCM encryption where configured.
- 🧾 **Integrity Verification:** SHA-256 hashes to help detect document changes.
- ⛓️ **Blockchain Anchoring:** Sui integration for document-integrity proofs.
- 🤖 **AI Assistance:** Simpler explanations of supported medical information.
- 📋 **Auditability:** Logging of supported sensitive actions.
- 🧑‍⚕️ **Role-Based Workspaces:** Separate workflows for patients, doctors, and administrators.

*Feature availability depends on the current implementation and environment configuration.*

---

## ✨ Key Features

### 🗂️ Medical Record Management
- Upload and organise medical records.
- Associate records with the appropriate patient.
- Calculate document hashes for integrity verification.
- Support secure document handling.

### 👤 Patient Consent Management
- Request access to patient records.
- Grant permissions with defined scopes and expiry.
- Revoke access when no longer needed.
- Enforce access permissions on the backend.

### ⛓️ Blockchain Integrity Verification
- Sui blockchain and Move smart-contract integration.
- Anchor document-integrity proofs.
- Keep medical documents and clinical text off-chain.
- Distinguish real transactions from simulated or unavailable states.

### 🤖 AI Medical Information Assistant
- Explain supported medical text in simpler language.
- Generate patient-friendly summaries where implemented.
- Keep AI provider credentials on the backend.
- Provide informational assistance rather than diagnosis.

### 🔐 Security and Auditability
- Authentication and server-side authorisation.
- Input validation and secure error handling.
- Audit logging for supported sensitive operations.
- Protection against unauthorised access.

### 📊 Role-Based Dashboards
- Patient workspace for personal records and consent.
- Doctor workspace for authorised record access.
- Administrative workspace for supported governance functions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| 🎨 Frontend | React, TypeScript, Vite |
| 💅 Styling | Tailwind CSS, where configured |
| 🎞️ Animation | Framer Motion, where configured |
| ⚙️ Backend | Node.js, Express.js, TypeScript |
| 🗄️ Database | MongoDB, Mongoose |
| 🔑 Authentication | JWT and password hashing, where configured |
| 🔒 Encryption | AES-256-GCM, where configured |
| 🧾 Integrity | SHA-256 |
| ⛓️ Blockchain | Sui, Move smart contracts |
| 🤖 AI | OpenAI API integration, where configured |
| ☁️ Deployment | Vercel and Render |

---

## 🏗️ System Architecture

```text
              👤 Patient / Doctor / Admin
                         |
                         v
              🌐 React + TypeScript UI
                         |
                         v
                 ⚙️ Express REST API
                         |
           +-------------+-------------+
           |             |             |
           v             v             v
      🗄️ MongoDB    🔐 Security    🤖 AI Service
                         |
                         v
                 ⛓️ Sui Integration
              Document Integrity Proofs
```

**Security principle:** Medical documents and clinical text should remain off-chain. Only intended integrity proofs and necessary non-sensitive transaction data should be anchored.

---

## 📁 Project Structure

```text
MediChain-AI-2.0/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.ts
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── routes/
├── sui/
│   ├── sources/
│   └── Move.toml
├── scripts/
├── docs/
├── package.json
└── README.md
```

*The actual directory structure may vary; follow the files present in the repository.*

---

## 💻 Getting Started

### 1️⃣ Prerequisites

Install the following:

- Git
- Node.js and npm supported by the project
- MongoDB, locally or through MongoDB Atlas
- Optional Sui testnet configuration
- Optional AI provider credentials

Check your installations:

```bash
node --version
npm --version
git --version
```

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/sayantandutta-18/Medichain-Ai-2.0.git
cd Medichain-Ai-2.0
```

### 3️⃣ Install Dependencies

```bash
npm install
```

Check available scripts:

```bash
npm run
```

If frontend and backend use separate package scripts, follow the instructions in their respective `package.json` files.

### 4️⃣ Run Locally

Use the development commands defined by your project. If these scripts exist, open two terminals.

**Backend:**

```bash
npm --prefix backend run dev
```

**Frontend:**

```bash
npm --prefix frontend run dev
```

Open the frontend URL printed in the terminal.

---

## 🔑 Environment Variables

### 🌐 Frontend — Vercel

In Vercel, open:

**Project → Settings → Environment Variables**

Configure:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://medichain-ai-2-0-2.onrender.com/api/v1` |

Apply it to the required environments, including **Production**. If you change an environment variable, redeploy the frontend because Vite variables are applied during the build.

### ⚙️ Backend — Render

In Render, open:

**Backend Service → Environment**

Configure the variables required by the backend. Depending on the project, these may include:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | Server port, if required by the application |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Authentication token signing secret |
| `ENCRYPTION_KEY` | Document-encryption key |
| `CORS_ORIGIN` | Allowed frontend origin, if supported by the backend |
| `SUI_NETWORK` | Blockchain network selection, if supported |
| AI provider key | Server-side AI integration |

**Important:** Use the exact variable names expected by the code. For CORS, allow the deployed Vercel origin:

`https://medichain-ai-2-0-7duf.vercel.app`

Do not replace existing allowed origins blindly; preserve any required local development origin.

Never publish passwords, API keys, private keys, seed phrases, or `.env` files.

---

## ☁️ Deployment Guide

### ⚙️ Backend Deployment — Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Select the MediChain backend service.
3. Connect it to the GitHub repository if it is not already connected.
4. Configure the build and start commands according to the backend `package.json` and Render service settings.
5. Add the required environment variables under **Environment**.
6. Ensure the MongoDB Atlas database user and network access are configured correctly.
7. Trigger a deploy or push a new commit if Auto-Deploy is enabled.
8. Check **Logs** and **Events** for errors.
9. Verify backend readiness:

   [Check Backend Health](https://medichain-ai-2-0-2.onrender.com/api/v1/health/ready)

A successful readiness response should report `ready: true`.

### 🌐 Frontend Deployment — Vercel

1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. Select the MediChain frontend project.
3. Open **Settings → Environment Variables**.
4. Set `VITE_API_URL` to:

   `https://medichain-ai-2-0-2.onrender.com/api/v1`

5. Ensure the correct frontend project and deployment environment are selected.
6. Open **Deployments**.
7. Push a commit or redeploy the latest deployment after changing environment variables.
8. Wait for the deployment to show **Ready**.
9. Open the live website:

   [🚀 MediChain AI 2.0](https://medichain-ai-2-0-7duf.vercel.app/)

### 🔄 Updating the Project

After modifying the code:

```bash
git status
git add .
git status
git commit -m "describe your changes"
git push origin main
```

Check the deployment status on Render and Vercel. If Auto-Deploy is enabled, a push may trigger a new deployment automatically.

Before `git add .`, confirm that no `.env` files or secrets are staged.

---

## 🧪 Testing

Check available scripts:

```bash
npm run
```

Run the tests and build commands supported by the repository, for example:

```bash
npm test
npm run build
```

Only use commands that exist in the project's `package.json` files.

### ✅ Production Smoke-Test Checklist

- [ ] Backend health endpoint responds.
- [ ] Database reports connected.
- [ ] Frontend loads successfully.
- [ ] Registration works.
- [ ] Login works.
- [ ] Authenticated `/auth/me` request uses the correct API path.
- [ ] CORS allows the deployed Vercel origin.
- [ ] Protected routes enforce authentication and permissions.
- [ ] Blockchain status clearly indicates real, simulated, or unavailable operation.

A successful build does not by itself prove that every production integration works.

---

## 🔐 Security

- Use server-side authorisation for protected operations.
- Enforce patient consent, scope, expiry, and revocation.
- Use authenticated encryption where implemented and configured.
- Keep secrets on the server and in secure deployment settings.
- Never publish medical documents or clinical text on-chain.
- Prevent unauthorised or cross-patient access.
- Ensure AI cannot bypass application permissions.
- Review and test security before using real patient information.

---

## 🔮 Future Improvements

- 🧪 More comprehensive integration and end-to-end testing
- 📊 Improved medical timelines and record search
- ♿ Better accessibility and responsive design
- 🔐 Encryption-key rotation and recovery procedures
- 📈 Security monitoring and audit verification
- 🌍 Multilingual AI explanations with safety evaluations
- 🚀 Improved deployment automation and observability

---

## ⚠️ Disclaimer

MediChain AI 2.0 is an **educational and portfolio MVP**. It is not a certified medical device, diagnostic system, or clinical decision-support tool. It is not represented as compliant with HIPAA, GDPR, India's DPDP Act, or any other healthcare regulation.

Do not use this project for diagnosis, treatment decisions, emergency triage, or real patient data. AI-generated explanations may be inaccurate and must not replace advice from a qualified healthcare professional.

---

## 👨‍💻 Author & Repository

- **GitHub:** [sayantandutta-18](https://github.com/sayantandutta-18)
- **Repository:** [MediChain AI 2.0](https://github.com/sayantandutta-18/Medichain-Ai-2.0)
- **Live Frontend:** [Vercel](https://medichain-ai-2-0-7duf.vercel.app/)
- **Backend API:** [Render](https://medichain-ai-2-0-2.onrender.com/api/v1)

---

<div align="center">

### 🏥 MediChain AI 2.0

**Building a more private, transparent, and patient-centric healthcare experience.** 🔐⛓️🤖

</div>
