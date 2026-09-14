import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { ReferenceService } from './reference.service.js';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('cities')
  getCities() {
    return this.referenceService.findCities();
  }

  @Get('districts/:cityId')
  getDistricts(@Param('cityId', ParseIntPipe) cityId: number) {
    return this.referenceService.findDistrictsByCity(cityId);
  }

  @Get('sms-providers')
  getSmsProviders() {
    return this.referenceService.findSmsProviders();
  }

  @Get('services')
  getServices() {
    return this.referenceService.findServices();
  }

  @Get('products')
  getProducts() {
    return this.referenceService.findProducts();
  }

  @Get('price-lists')
  getPriceLists() {
    return this.referenceService.findPriceLists();
  }

  @Get('customer-categories')
  getCustomerCategories() {
    return this.referenceService.findCustomerCategories();
  }

  @Get('customer-categories/:id/subcategories')
  getCustomerSubcategories(@Param('id', ParseUUIDPipe) id: string) {
    return this.referenceService.findCustomerSubcategories(id);
  }
}
