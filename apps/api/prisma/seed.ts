import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const saltRounds = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, saltRounds);
}

async function clearDatabase() {
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.scheduleWeek.deleteMany();
  await prisma.vacationRequest.deleteMany();
  await prisma.availabilityDay.deleteMany();
  await prisma.availabilityWeek.deleteMany();
  await prisma.availabilitySubmissionWeek.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

async function main() {
  const adminPasswordHash = await hashPassword("qwer1234");

  await clearDatabase();

  await prisma.user.create({
    data: {
      email: "superadmin@bkworkforce.com",
      passwordHash: adminPasswordHash,
      firstName: "Super",
      lastName: "Admin",
      role: "ADMIN",
      tenantId: null,
      employeeSubRole: null,
      workerType: null,
      contractHours: null,
      mustChangePassword: false,
      isActive: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
