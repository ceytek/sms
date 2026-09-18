import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

export type ContactActor = {
  id: string;
  role: string;
  companyId?: string;
  impersonatedBy?: string;
};

@Injectable()
export class ContactAccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  ownerCompanyId(actor: ContactActor): string {
    if (!actor.companyId) {
      throw new ForbiddenException('Firma bilgisi bulunamadı');
    }
    return actor.companyId;
  }

  async companyImportActor(actor: ContactActor): Promise<{ role: Role; companyId: string } | null> {
    if (!actor.impersonatedBy) return null;
    const original = await this.userRepository.findOne({
      where: { id: actor.impersonatedBy },
    });
    if (!original?.companyId) return null;
    if (original.role !== Role.ADMIN && original.role !== Role.DEALER) return null;
    return { role: original.role, companyId: original.companyId };
  }
}
