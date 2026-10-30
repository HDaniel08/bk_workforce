import { Module } from "@nestjs/common";
import { ManagerSchedulesController } from "./manager-schedules.controller";
import { ManagerSchedulesService } from "./manager-schedules.service";

@Module({ controllers: [ManagerSchedulesController], providers: [ManagerSchedulesService] })
export class ManagerSchedulesModule {}
