import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { CustomerCategory } from '../reference/entities/customer-category.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentType } from './entities/document-type.entity.js';
import { DocumentTypeAssignment } from './entities/document-type-assignment.entity.js';
import { CompanyDocument } from './entities/company-document.entity.js';
import { CompanyDocumentProcess } from './entities/company-document-process.entity.js';
import { DocumentsService } from './documents.service.js';
import { DocumentTypesController } from './document-types.controller.js';
import { CompanyDocumentsController } from './company-documents.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentType,
      DocumentTypeAssignment,
      CompanyDocument,
      CompanyDocumentProcess,
      Company,
      CustomerCategory,
    ]),
    AuthModule,
  ],
  controllers: [DocumentTypesController, CompanyDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
