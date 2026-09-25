import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ SQLite/PostgreSQL Database Connected Successfully via Prisma');
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
  }
};
