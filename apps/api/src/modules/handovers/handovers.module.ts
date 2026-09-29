import { Module } from "@nestjs/common";
import { HandoversController } from "./handovers.controller";
import { HandoversService } from "./handovers.service";

@Module({
  controllers: [HandoversController],
  providers: [HandoversService]
})
export class HandoversModule {}

