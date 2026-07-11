import { PrismaClient, type Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const saltRounds = 10;
const seedPassword = "qwer1234";
const historyWeekCount = 6;

const demoUsers = [
  { firstName: "Bence", lastName: "Kovacs", email: "manager1@bk.test", employeeSubRole: "MANAGER" },
  { firstName: "Reka", lastName: "Nagy", email: "manager2@bk.test", employeeSubRole: "MANAGER" },
  { firstName: "Milan", lastName: "Szabo", email: "manager3@bk.test", employeeSubRole: "MANAGER" },
  { firstName: "Anna", lastName: "Toth", email: "worker01@bk.test", workerType: "STUDENT" },
  { firstName: "Mark", lastName: "Varga", email: "worker02@bk.test", workerType: "FULL_TIME" },
  { firstName: "Lili", lastName: "Horvath", email: "worker03@bk.test", workerType: "STUDENT" },
  { firstName: "Noel", lastName: "Kiss", email: "worker04@bk.test", workerType: "FULL_TIME" },
  { firstName: "Sara", lastName: "Molnar", email: "worker05@bk.test", workerType: "STUDENT" },
  { firstName: "David", lastName: "Farkas", email: "worker06@bk.test", workerType: "FULL_TIME" },
  { firstName: "Emma", lastName: "Balogh", email: "worker07@bk.test", workerType: "STUDENT" },
  { firstName: "Mate", lastName: "Papp", email: "worker08@bk.test", workerType: "FULL_TIME" },
  { firstName: "Zoe", lastName: "Takacs", email: "worker09@bk.test", workerType: "STUDENT" },
  { firstName: "Adam", lastName: "Juhasz", email: "worker10@bk.test", workerType: "FULL_TIME" },
  { firstName: "Nora", lastName: "Lakatos", email: "worker11@bk.test", workerType: "STUDENT" },
  { firstName: "Levente", lastName: "Meszaros", email: "worker12@bk.test", workerType: "FULL_TIME" },
  { firstName: "Dorka", lastName: "Simon", email: "worker13@bk.test", workerType: "STUDENT" },
  { firstName: "Botond", lastName: "Racz", email: "worker14@bk.test", workerType: "FULL_TIME" },
  { firstName: "Hanna", lastName: "Fekete", email: "worker15@bk.test", workerType: "STUDENT" },
  { firstName: "Oliver", lastName: "Szalai", email: "worker16@bk.test", workerType: "FULL_TIME" },
  { firstName: "Laura", lastName: "Nemeth", email: "worker17@bk.test", workerType: "STUDENT" },
  { firstName: "Marcell", lastName: "Biro", email: "worker18@bk.test", workerType: "FULL_TIME" },
  { firstName: "Fanni", lastName: "Kerekes", email: "worker19@bk.test", workerType: "STUDENT" },
  { firstName: "Patrik", lastName: "Vincze", email: "worker20@bk.test", workerType: "FULL_TIME" },
  { firstName: "Luca", lastName: "Hegedus", email: "worker21@bk.test", workerType: "STUDENT" },
  { firstName: "Gabor", lastName: "Sipos", email: "worker22@bk.test", workerType: "FULL_TIME" }
] satisfies Array<{
  firstName: string;
  lastName: string;
  email: string;
  employeeSubRole?: "MANAGER";
  workerType?: "STUDENT" | "FULL_TIME";
}>;

async function hashPassword(password: string) {
  return bcrypt.hash(password, saltRounds);
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

async function clearDatabase() {
  try {
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
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "A lokalis adatbazis nincs felmigralva. Futtasd az apps/api mappaban: npx prisma migrate dev"
      );
    }

    throw error;
  }
}

function getUtcWeekStart(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getUtcMonthDays(monthStartDate: Date) {
  const dayCount = new Date(
    Date.UTC(monthStartDate.getUTCFullYear(), monthStartDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  return Array.from({ length: dayCount }, (_, index) => addUtcDays(monthStartDate, index));
}

function getWorkerAvailabilityDays(
  weekStartDate: Date,
  userIndex: number,
  weekIndex: number,
  workerType: "STUDENT" | "FULL_TIME"
): Prisma.AvailabilityDayCreateWithoutAvailabilityWeekInput[] {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = addUtcDays(weekStartDate, dayIndex);
    const isWeekend = dayIndex >= 5;
    const hasRestDay = (userIndex + dayIndex + weekIndex) % 6 === 0;

    if (isWeekend && (userIndex + weekIndex) % 4 !== dayIndex - 5) {
      return {
        date,
        type: "OFF",
        workPreference: null,
        startTime: null,
        endTime: null,
        note: "Piheno"
      };
    }

    if (hasRestDay && workerType === "STUDENT") {
      return {
        date,
        type: "OFF",
        workPreference: null,
        startTime: null,
        endTime: null,
        note: "Egyetem"
      };
    }

    if ((userIndex + dayIndex) % 3 === 0) {
      return {
        date,
        type: "WORK",
        workPreference: "TIME_RANGE",
        startTime: workerType === "STUDENT" ? "16:00" : "09:00",
        endTime: workerType === "STUDENT" ? "22:00" : "17:00",
        note: ""
      };
    }

    return {
      date,
      type: "WORK",
      workPreference: "ANYTIME",
      startTime: null,
      endTime: null,
      note: ""
    };
  });
}

function getManagerAvailabilityDays(
  monthStartDate: Date,
  managerIndex: number
): Prisma.AvailabilityDayCreateWithoutAvailabilityWeekInput[] {
  return getUtcMonthDays(monthStartDate).map((date) => {
    const day = date.getUTCDay();

    if (day === 0 || (day === 6 && managerIndex !== 1)) {
      return {
        date,
        type: "OFF",
        workPreference: null,
        startTime: null,
        endTime: null,
        note: "Piheno"
      };
    }

    if ((date.getUTCDate() + managerIndex) % 5 === 0) {
      return {
        date,
        type: "WORK",
        workPreference: "TIME_RANGE",
        startTime: "10:00",
        endTime: "18:00",
        note: ""
      };
    }

    return {
      date,
      type: "WORK",
      workPreference: "ANYTIME",
      startTime: null,
      endTime: null,
      note: ""
    };
  });
}

async function main() {
  const passwordHash = await hashPassword(seedPassword);

  await clearDatabase();

  await prisma.user.create({
    data: {
      email: "superadmin@bkworkforce.com",
      passwordHash,
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

  const tenant = await prisma.tenant.create({
    data: {
      name: "BK Demo",
      slug: "bk-demo",
      city: "Budapest",
      address: "Demo utca 1.",
      isActive: true
    }
  });

  const users = await Promise.all(
    demoUsers.map((user, index) =>
      prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: user.email,
          passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: `+36 30 555 ${String(index + 1).padStart(4, "0")}`,
          role: "EMPLOYEE",
          employeeSubRole: user.employeeSubRole ?? "WORKER",
          workerType: user.employeeSubRole === "MANAGER" ? null : user.workerType,
          contractHours:
            user.employeeSubRole === "MANAGER"
              ? "HOURS_8"
              : user.workerType === "FULL_TIME"
                ? "HOURS_8"
                : index % 2 === 0
                  ? "HOURS_4"
                  : "HOURS_6",
          mustChangePassword: false,
          isActive: true
        }
      })
    )
  );

  const managers = users.filter((user) => user.employeeSubRole === "MANAGER");
  const workers = users.filter((user) => user.employeeSubRole === "WORKER");
  const currentWeekStart = getUtcWeekStart(new Date());
  const weekStarts = Array.from({ length: historyWeekCount }, (_, index) =>
    addUtcDays(currentWeekStart, -7 * (historyWeekCount - index))
  );
  const managerMonthStarts = [
    getUtcMonthStart(addUtcDays(currentWeekStart, -35)),
    getUtcMonthStart(currentWeekStart)
  ];

  for (const weekStartDate of weekStarts) {
    await prisma.availabilitySubmissionWeek.create({
      data: {
        tenantId: tenant.id,
        weekStartDate,
        status: "CLOSED",
        openedByUserId: managers[0]?.id,
        closedByUserId: managers[0]?.id,
        openedAt: addUtcDays(weekStartDate, -7),
        closedAt: addUtcDays(weekStartDate, -1)
      }
    });
  }

  for (const [weekIndex, weekStartDate] of weekStarts.entries()) {
    for (const [userIndex, worker] of workers.entries()) {
      await prisma.availabilityWeek.create({
        data: {
          tenantId: tenant.id,
          userId: worker.id,
          periodType: "WEEKLY",
          weekStartDate,
          monthStartDate: null,
          status: "LOCKED",
          submittedAt: addUtcDays(weekStartDate, -2),
          days: {
            create: getWorkerAvailabilityDays(
              weekStartDate,
              userIndex,
              weekIndex,
              worker.workerType ?? "STUDENT"
            )
          }
        }
      });
    }
  }

  for (const [managerIndex, manager] of managers.entries()) {
    for (const monthStartDate of managerMonthStarts) {
      await prisma.availabilityWeek.create({
        data: {
          tenantId: tenant.id,
          userId: manager.id,
          periodType: "MONTHLY",
          weekStartDate: null,
          monthStartDate,
          status: "SUBMITTED",
          submittedAt: addUtcDays(monthStartDate, 1),
          days: {
            create: getManagerAvailabilityDays(monthStartDate, managerIndex)
          }
        }
      });
    }
  }

  console.log(`Seed kesz: ${users.length} tenant user, ${managers.length} manager, ${workers.length} worker.`);
  console.log(`Belepes: manager1@bk.test / ${seedPassword}, worker01@bk.test / ${seedPassword}`);
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
