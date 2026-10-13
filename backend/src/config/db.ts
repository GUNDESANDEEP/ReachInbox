import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const seedDefaultData = async () => {
  // Production mode: Do not seed dummy mock emails
  return;
};

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ SQLite/PostgreSQL Database Connected Successfully via Prisma');
    await seedDefaultData();
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
  }
};
