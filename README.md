🏥 MediChain AI 2.0

🔐 Your Health Records. Your Permission. Verifiable Integrity.

🔗 Quick Links







Resource



Link



Purpose





🚀 Live Frontend



Open MediChain AI 2.0



Open the deployed web application





⚙️ Backend API



Open API base URL



Production API base path





❤️ Backend Health



Check readiness



Check whether configured backend subsystems are ready





💻 GitHub Repository



View source code



Browse the project code



ℹ️ The API base URL may not display a normal webpage when opened directly. Use the health endpoint to check service readiness.

MediChain AI 2.0 is a privacy-focused healthcare platform designed to give patients greater control over their medical records through consent-based access, document encryption, cryptographic integrity verification, Sui blockchain integration, and AI-assisted medical information explanations.



🧩 Project Type: Full-Stack Healthcare Technology MVP
🎯 Focus: Healthcare · AI · Cybersecurity · Blockchain · Web Development



🌐 Live Deployment







Component



URL



Hosting





🖥️ Frontend



Open MediChain AI 2.0



Vercel





⚙️ Backend API



Open API base URL



Render





❤️ Backend readiness check



Check API readiness



Render



ℹ️ The API base URL may return a not-found response when opened directly if no root API route is defined. Use the health/readiness endpoint to check service status. Blockchain features may be simulated depending on the current environment configuration.





📌 1. Overview

Medical records are often scattered across different hospitals, laboratories, and healthcare platforms. Patients may struggle to manage their health information and understand who has access to it.

MediChain AI 2.0 explores a patient-centric approach to medical data management by combining secure backend authorization, cryptographic verification, blockchain-based integrity proofs, and AI-assisted explanations.

The platform is designed around one central principle:

Patients should have greater visibility and control over who can access their medical records.

❗ 2. Problem Statement

Traditional medical-record management can present several challenges:





Medical records are distributed across multiple healthcare providers.



Patients may have limited visibility into data-access permissions.



Unauthorized access to sensitive information is a security risk.



Detecting whether a document has been modified can be difficult.



Medical reports may contain terminology that is difficult for patients to understand.



💡 3. Our Solution

MediChain AI 2.0 aims to address these challenges through:





Patient-Controlled Access: Consent-based permissions for sharing records with doctors.



Encrypted Medical Records: Protect supported documents using AES-256-GCM encryption.



Cryptographic Integrity: Use SHA-256 hashes to verify document integrity.



Blockchain Anchoring: Use Sui blockchain integration to anchor integrity proofs without storing medical documents on-chain.



Auditability: Maintain records of sensitive actions where implemented.



AI-Assisted Explanations: Help users understand supported medical information in simpler language.



Role-Based Workspaces: Provide separate workflows for patients, doctors, and administrators.



✨ 4. Key Features



🗂️ Medical Record Management





Upload and organise medical records.



Associate records with the appropriate patient.



Calculate cryptographic hashes for integrity verification.



Support secure document handling according to backend configuration.



🤝 Patient Consent Management





Request access to patient records.



Grant permissions with defined scopes and expiry.



Revoke access when it is no longer needed.



Enforce access permissions on the backend.



⛓️ Blockchain Integrity Verification





Integrate with Sui and Move smart contracts.



Anchor document-integrity proofs.



Keep medical documents and clinical text off-chain.



Distinguish real blockchain transactions from simulated or unavailable states.



🤖 AI Medical Information Assistant





Explain supported medical text in simpler language.



Provide patient-friendly summaries where implemented.



Keep AI provider credentials on the backend.



Treat generated explanations as informational rather than diagnostic.



🛡️ Security and Auditability





Authentication and server-side authorization.



Input validation and secure error handling.



Audit logging for supported sensitive operations.



Protection against unauthorized and cross-patient access.



👥 Role-Based Dashboards





Patient workspace for personal records and consent.



Doctor workspace for authorised record access.



Administrative workspace for supported governance functions.

Feature availability depends on the current implementation and environment configuration.

🛠️ 5. Technology Stack







Layer



Technologies





Frontend



React, TypeScript, Vite





Styling and Animation



Tailwind CSS, Framer Motion, where configured





3D Interface



Three.js / React Three Fiber, where configured





Backend



Node.js, Express.js, TypeScript





Database



MongoDB, Mongoose





Validation



Zod, where configured





Authentication



JWT and password hashing, where configured





Encryption



AES-256-GCM, where configured





Integrity Verification



SHA-256





Blockchain



Sui, Move smart contracts





Testing



Vitest and repository-defined test tools



🏗️ 6. System Architecture

┌──────────────────────────────┐
│       React Frontend         │
│ Patient · Doctor · Admin     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Express API            │
│ Authentication & Validation  │
│ Consent & Access Policies    │
│ Records · AI · Audit         │
└────────┬────────────┬────────┘
         │            │
         ▼            ▼
┌────────────────┐  ┌─────────────────┐
│    MongoDB     │  │   Sui Blockchain │
│ Application    │  │ Integrity proofs │
│ Data & Records │  │ and transactions │
└────────────────┘  └─────────────────┘

Sensitive medical documents should remain off-chain. Only the intended cryptographic proof and necessary non-sensitive transaction data should be anchored.

📂 7. Repository Structure

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
├── docker-compose.yml
├── package.json
└── README.md

The actual directory structure may vary slightly; follow the files in the current repository.

🚀 8. Getting Started



📋 Prerequisites

Install the following before running the project:





Git



Node.js and npm versions supported by the repository



MongoDB, locally or through a hosted database



Optional Sui testnet configuration



Optional AI provider credentials

Verify your installation:

node --version
npm --version
git --version



1️⃣ Clone the Repository

git clone https://github.com/sayantandutta-18/Medichain-Ai-2.0.git
cd Medichain-Ai-2.0



2️⃣ Install Dependencies

npm install

Check the available scripts:

npm run

If the backend and frontend use separate package scripts, follow the instructions in their respective package.json files.

3️⃣ Configure Environment Variables

Locate the project's example environment files and copy the relevant example to the expected local .env location.

For example, in PowerShell, only if this file exists:

Copy-Item backend/.env.example backend/.env

Configure the variables required by the actual backend configuration. They may include:







Variable



Purpose





NODE_ENV



Application environment





PORT



Backend server port





MONGODB_URI



MongoDB connection





JWT_SECRET



Authentication token signing secret





ENCRYPTION_KEY



Document-encryption key





CORS_ORIGIN



Allowed frontend origin





SUI_NETWORK



Sui network selection





AI provider key



Server-side AI integration

Use the exact variable names required by the repository.

Never commit .env files, passwords, API keys, wallet private keys, or seed phrases. Use secure environment settings for deployments.

4️⃣ Start the Backend

If the backend defines a dev script:

npm --prefix backend run dev



5️⃣ Start the Frontend

Open another terminal at the repository root:

npm --prefix frontend run dev

Open the frontend URL printed in the terminal. Confirm that the API base URL and backend port match your local configuration.



If either command is not defined in the repository, inspect that package's scripts and use the available development command.



🔐 9. Security Design

Security is a central design goal of MediChain AI 2.0.





Server-Side Authorization: Protected operations must be authorised by the backend.



Patient Consent: Access should respect permission scope, expiry, and revocation.



Document Encryption: Use authenticated encryption where implemented and configured.



Integrity Verification: Compare SHA-256 hashes to detect document changes.



Data Minimisation: Do not publish medical documents or clinical text on-chain.



Secret Management: Store credentials in environment variables or a deployment secret manager.



AI Guardrails: AI must not bypass application permissions or independently execute sensitive actions.

Before any real-data use, the security design requires thorough independent review and testing.

🧪 10. Testing

Run the scripts available in the repository:

npm run

Common checks, if defined, include:

npm test
npm run typecheck
npm run build
npm run smoke

Verify the actual output before claiming that tests pass. A successful frontend build alone does not establish that the backend, database, blockchain, and AI integrations all work correctly.

Recommended security tests include:





Unauthenticated access to protected endpoints.



Access to another patient's records.



Access after consent expiry.



Access after consent revocation.



Invalid upload and input handling.



Document-integrity verification.



Correct handling of unavailable or simulated blockchain services.



⛓️ 11. Blockchain Integration

Sui blockchain integration is intended to provide an integrity-verification layer.

The design aims to:





Calculate a cryptographic hash for a document.



Store the document through the configured application storage flow.



Anchor the intended integrity proof through the Sui integration.



Verify the proof when requested.



Report whether the result is verified, simulated, unavailable, or mismatched.

Blockchain status must reflect the actual result. Simulated transactions must never be presented as real on-chain transactions.

☁️ 12. Deployment



🖥️ Frontend Deployment — Vercel





Import the GitHub repository into Vercel or open the existing frontend project.



Open Settings → Environment Variables.



Add or update the following variable for Production (and Preview if needed):







Key



Value





VITE_API_URL



https://medichain-ai-2-0-2.onrender.com/api/v1



Save the variable and redeploy the frontend. Vite environment variables are applied during the build, so a new deployment is required after changing them.



Open the live frontend and test registration, login, and authenticated requests.



⚙️ Backend Deployment — Render





Open the Render Dashboard and select the backend service.



Configure the environment variables required by the backend in Environment. Use the exact names expected by the code. Common examples include MONGODB_URI, JWT_SECRET, ENCRYPTION_KEY, and the CORS origin variable if configured by the project. Never put secret values in this README.



Ensure the production CORS allowlist includes the deployed Vercel origin: https://medichain-ai-2-0-7duf.vercel.app. If a custom domain or a different Vercel deployment is used, allow that exact origin too.



Push code changes to GitHub and verify that the latest Render deployment finishes successfully.



Check the backend readiness endpoint. A ready: true response indicates that the configured readiness checks passed at the time of the request.



🔒 Do not commit .env files, database credentials, JWT secrets, encryption keys, API keys, wallet private keys, or seed phrases.

A deployment requires configuration and verification of:





Backend hosting and runtime environment.



MongoDB connection and database access restrictions.



Frontend production API URL.



Production CORS origins and HTTPS.



Secure environment variables.



Optional Sui and AI credentials.



Backend health checks and application logs.



Production builds and end-to-end smoke tests.

Use the build and start commands supported by the repository and hosting provider. Do not deploy with development credentials or unverified security assumptions.

🔮 13. Future Improvements

Potential development priorities include:





More comprehensive integration and end-to-end tests.



Better record search and medical timeline experiences.



Improved accessibility and responsive UI.



Stronger encryption-key rotation and recovery procedures.



Better security monitoring and audit verification.



Multilingual AI explanations with safety evaluations.



Improved deployment automation and observability.



Verified demo screenshots and a reproducible demo environment.



🎬 14. Demo Guidelines

For a portfolio demonstration:





Use synthetic patient and medical-record data.



Show the patient dashboard and record-management workflow.



Demonstrate a doctor access request and patient consent.



Show that unauthorised or revoked access is denied.



Explain document-integrity verification.



Clearly label real, simulated, and unavailable blockchain states.



Demonstrate AI explanations without using real patient information.

Add screenshots or a demo video here once they are available and verified.

⚠️ 15. Important Disclaimer

MediChain AI 2.0 is an educational and portfolio MVP. It is not a certified medical device, diagnostic system, or clinical decision-support tool. It is not represented as compliant with HIPAA, GDPR, India's DPDP Act, or any other healthcare regulation.

Do not use it for diagnosis, treatment decisions, emergency triage, or real patient data. AI-generated explanations may be inaccurate and must not replace guidance from a qualified healthcare professional.

📄 16. License

Add or verify the repository's LICENSE file before stating a specific license. If the project uses the MIT License, link to that file here.



MediChain AI 2.0 — Exploring privacy-first healthcare software through AI, cryptographic integrity, and blockchain technology.
