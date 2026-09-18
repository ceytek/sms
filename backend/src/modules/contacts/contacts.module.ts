import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/entities/user.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Contact } from './entities/contact.entity.js';
import { ContactGroup } from './entities/contact-group.entity.js';
import { ContactGroupMember } from './entities/contact-group-member.entity.js';
import { ContactTag } from './entities/contact-tag.entity.js';
import { ContactTagMember } from './entities/contact-tag-member.entity.js';
import { ContactImportJob } from './entities/contact-import-job.entity.js';
import { ContactImportError } from './entities/contact-import-error.entity.js';
import { ContactCustomField } from './entities/contact-custom-field.entity.js';
import { ContactAccessService } from './services/contact-access.service.js';
import { ContactGroupsService } from './services/contact-groups.service.js';
import { ContactTagsService } from './services/contact-tags.service.js';
import { ContactCustomFieldsService } from './services/contact-custom-fields.service.js';
import { ContactsService } from './services/contacts.service.js';
import { ContactImportService } from './services/contact-import.service.js';
import { ContactsController } from './contacts.controller.js';
import { ContactGroupsController } from './contact-groups.controller.js';
import { ContactTagsController } from './contact-tags.controller.js';
import { ContactCustomFieldsController } from './contact-custom-fields.controller.js';
import { ContactImportsController } from './contact-imports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      ContactGroup,
      ContactGroupMember,
      ContactTag,
      ContactTagMember,
      ContactImportJob,
      ContactImportError,
      ContactCustomField,
      Company,
      User,
    ]),
    AuthModule,
  ],
  controllers: [
    ContactGroupsController,
    ContactTagsController,
    ContactCustomFieldsController,
    ContactImportsController,
    ContactsController,
  ],
  providers: [
    ContactAccessService,
    ContactGroupsService,
    ContactTagsService,
    ContactCustomFieldsService,
    ContactsService,
    ContactImportService,
  ],
  exports: [ContactsService, ContactGroupsService, ContactTagsService, ContactCustomFieldsService],
})
export class ContactsModule {}
