import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    entityType: string,
    entityId: string | undefined,
    actorUserId: string | undefined,
    companyId: string | undefined,
    oldValues: Record<string, unknown> | null | undefined,
    newValues: Record<string, unknown> | null | undefined,
    ipAddress?: string,
    manager?: EntityManager,
  ): Promise<AuditLog> {
    const repo = manager
      ? manager.getRepository(AuditLog)
      : this.auditLogRepository;

    const entry = repo.create({
      action,
      entityType,
      entityId,
      actorUserId,
      companyId,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ipAddress,
    });

    return repo.save(entry);
  }
}
