import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { env } from '../src/config/env.js';

export async function seed(): Promise<void> {
  console.log('--- Starting MediChain-AI Synthetic Data Seed ---');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/medichain';
  await connectDB(mongoUri);

  try {
    // Generate synthetic password hashes using bcryptjs cost 12
    const defaultPassword = 'TestPassword123!';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const syntheticUsers = [
      {
        email: 'patient.alice@example.dev',
        passwordHash,
        role: 'PATIENT' as const,
        firstName: 'SyntheticAlice',
        lastName: 'PatientOne',
        schemaVersion: 1,
      },
      {
        email: 'patient.bob@example.dev',
        passwordHash,
        role: 'PATIENT' as const,
        firstName: 'SyntheticBob',
        lastName: 'PatientTwo',
        schemaVersion: 1,
      },
      {
        email: 'doctor.clara@example.dev',
        passwordHash,
        role: 'DOCTOR' as const,
        firstName: 'Dr. Clara',
        lastName: 'Clinician',
        schemaVersion: 1,
      },
      {
        email: 'admin.system@example.dev',
        passwordHash,
        role: 'ADMIN' as const,
        firstName: 'Admin',
        lastName: 'Overseer',
        schemaVersion: 1,
      },
    ];

    for (const userData of syntheticUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`[Seed] Created synthetic user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`[Seed] User already exists: ${userData.email} (${userData.role})`);
      }
    }

    console.log('--- Seed Completed Successfully (SYNTHETIC USERS ONLY) ---');
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
