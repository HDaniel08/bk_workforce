import {
  ContractHours,
  PrismaClient,
  WorkerType
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const saltRounds = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  const [
    adminPasswordHash,
    managerPasswordHash,
    studentPasswordHash,
    workerPasswordHash
  ] = await Promise.all([
    hashPassword("Admin123!"),
    hashPassword("Manager123!"),
    hashPassword("Student123!"),
    hashPassword("Worker123!")
  ]);

  await prisma.user.upsert({
    where: { email: "admin@bk-app.local" },
    update: {
      tenantId: null,
      passwordHash: adminPasswordHash,
      firstName: "Global",
      lastName: "Admin",
      role: "ADMIN",
      employeeSubRole: null,
      workerType: null,
      contractHours: null,
      mustChangePassword: false,
      isActive: true
    },
    create: {
      email: "admin@bk-app.local",
      passwordHash: adminPasswordHash,
      firstName: "Global",
      lastName: "Admin",
      role: "ADMIN",
      mustChangePassword: false
    }
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "bk-pecs-drive-2" },
    update: {
      name: "BK Pécs Drive 2",
      city: "Pécs",
      isActive: true
    },
    create: {
      name: "BK Pécs Drive 2",
      slug: "bk-pecs-drive-2",
      city: "Pécs"
    }
  });

  const managers = [
    {
      email: "andras.fodor@bk-app.local",
      firstName: "Andras",
      lastName: "Fodor"
    },
    {
      email: "kata.biro@bk-app.local",
      firstName: "Kata",
      lastName: "Biro"
    },
    {
      email: "laszlo.csikos@bk-app.local",
      firstName: "Laszlo",
      lastName: "Csikos"
    },
    {
      email: "eva.meszaros@bk-app.local",
      firstName: "Eva",
      lastName: "Meszaros"
    }
  ];

  await prisma.user.updateMany({
    where: {
      tenantId: tenant.id,
      role: "EMPLOYEE",
      employeeSubRole: "MANAGER",
      email: { notIn: managers.map((manager) => manager.email) }
    },
    data: { isActive: false }
  });

  await Promise.all(
    managers.map((manager) =>
      prisma.user.upsert({
        where: { email: manager.email },
        update: {
          tenantId: tenant.id,
          passwordHash: managerPasswordHash,
          firstName: manager.firstName,
          lastName: manager.lastName,
          role: "EMPLOYEE",
          employeeSubRole: "MANAGER",
          workerType: null,
          contractHours: "HOURS_8",
          mustChangePassword: true,
          isActive: true
        },
        create: {
          tenantId: tenant.id,
          email: manager.email,
          passwordHash: managerPasswordHash,
          firstName: manager.firstName,
          lastName: manager.lastName,
          role: "EMPLOYEE",
          employeeSubRole: "MANAGER",
          contractHours: "HOURS_8",
          mustChangePassword: true
        }
      })
    )
  );

  const workers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    workerType: WorkerType;
    contractHours: ContractHours;
  }> = [
    {
      email: "adam.balla@bk-app.local",
      firstName: "Adam",
      lastName: "Balla",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "anna.farkas@bk-app.local",
      firstName: "Anna",
      lastName: "Farkas",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "balazs.kovacs@bk-app.local",
      firstName: "Balazs",
      lastName: "Kovacs",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "eszter.lakatos@bk-app.local",
      firstName: "Eszter",
      lastName: "Lakatos",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "gergo.nagy@bk-app.local",
      firstName: "Gergo",
      lastName: "Nagy",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "reka.szabo@bk-app.local",
      firstName: "Reka",
      lastName: "Szabo",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "tamas.toth@bk-app.local",
      firstName: "Tamas",
      lastName: "Toth",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_8
    },
    {
      email: "dora.horvath@bk-app.local",
      firstName: "Dora",
      lastName: "Horvath",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_6
    },
    {
      email: "milan.kiss@bk-app.local",
      firstName: "Milan",
      lastName: "Kiss",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_6
    },
    {
      email: "noemi.varga@bk-app.local",
      firstName: "Noemi",
      lastName: "Varga",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_6
    },
    {
      email: "emese.balogh@bk-app.local",
      firstName: "Emese",
      lastName: "Balogh",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "mate.juhasz@bk-app.local",
      firstName: "Mate",
      lastName: "Juhasz",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "zsofia.papp@bk-app.local",
      firstName: "Zsofia",
      lastName: "Papp",
      workerType: WorkerType.FULL_TIME,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "bence.barta@bk-app.local",
      firstName: "Bence",
      lastName: "Barta",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "csenge.dudas@bk-app.local",
      firstName: "Csenge",
      lastName: "Dudas",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "daniel.feher@bk-app.local",
      firstName: "Daniel",
      lastName: "Feher",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "fanni.gal@bk-app.local",
      firstName: "Fanni",
      lastName: "Gal",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "hanna.illes@bk-app.local",
      firstName: "Hanna",
      lastName: "Illes",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "istvan.kerekes@bk-app.local",
      firstName: "Istvan",
      lastName: "Kerekes",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "julia.lengyel@bk-app.local",
      firstName: "Julia",
      lastName: "Lengyel",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "levente.molnar@bk-app.local",
      firstName: "Levente",
      lastName: "Molnar",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "lilla.orosz@bk-app.local",
      firstName: "Lilla",
      lastName: "Orosz",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "mark.simon@bk-app.local",
      firstName: "Mark",
      lastName: "Simon",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "nora.takacs@bk-app.local",
      firstName: "Nora",
      lastName: "Takacs",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    },
    {
      email: "petra.veres@bk-app.local",
      firstName: "Petra",
      lastName: "Veres",
      workerType: WorkerType.STUDENT,
      contractHours: ContractHours.HOURS_4
    }
  ];

  await prisma.user.updateMany({
    where: {
      tenantId: tenant.id,
      role: "EMPLOYEE",
      employeeSubRole: "WORKER",
      email: { notIn: workers.map((worker) => worker.email) }
    },
    data: { isActive: false }
  });

  await Promise.all(
    workers.map((worker) =>
      prisma.user.upsert({
        where: { email: worker.email },
        update: {
          tenantId: tenant.id,
          passwordHash:
            worker.workerType === WorkerType.STUDENT
              ? studentPasswordHash
              : workerPasswordHash,
          firstName: worker.firstName,
          lastName: worker.lastName,
          role: "EMPLOYEE",
          employeeSubRole: "WORKER",
          workerType: worker.workerType,
          contractHours: worker.contractHours,
          mustChangePassword: true,
          isActive: true
        },
        create: {
          tenantId: tenant.id,
          email: worker.email,
          passwordHash:
            worker.workerType === WorkerType.STUDENT
              ? studentPasswordHash
              : workerPasswordHash,
          firstName: worker.firstName,
          lastName: worker.lastName,
          role: "EMPLOYEE",
          employeeSubRole: "WORKER",
          workerType: worker.workerType,
          contractHours: worker.contractHours,
          mustChangePassword: true
        }
      })
    )
  );
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
