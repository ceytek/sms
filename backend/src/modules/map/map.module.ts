import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { MapController } from './map.controller.js';
import { MapService } from './map.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
