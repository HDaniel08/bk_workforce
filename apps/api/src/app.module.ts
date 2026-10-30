import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { HealthModule } from "./modules/health/health.module";
import { HandoversModule } from "./modules/handovers/handovers.module";
import { MailModule } from "./modules/mail/mail.module";
import { ManagerSchedulesModule } from "./modules/manager-schedules/manager-schedules.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { VacationRequestsModule } from "./modules/vacation-requests/vacation-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"]
    }),
    PrismaModule,
    HealthModule,
    HandoversModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    AuditLogsModule,
    AvailabilityModule,
    VacationRequestsModule,
    MailModule,
    ManagerSchedulesModule,
    NotificationsModule
  ]
})
export class AppModule {}
