import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity.js';
import { WalletTransaction } from '../../wallets/entities/wallet-transaction.entity.js';
import { WalletType } from '../../../common/enums/wallet-type.enum.js';
import { TransactionType } from '../../../common/enums/transaction-type.enum.js';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';

const TERMINAL: SmsCampaignStatus[] = [
  SmsCampaignStatus.COMPLETED,
  SmsCampaignStatus.PARTIALLY_COMPLETED,
  SmsCampaignStatus.FAILED,
  SmsCampaignStatus.CANCELLED,
];

@Injectable()
export class SmsBalanceService {
  constructor(private readonly dataSource: DataSource) {}

  async currentSmsBalance(companyId: string) {
    const wallet = await this.dataSource.getRepository(Wallet).findOne({
      where: { companyId, walletType: WalletType.SMS },
    });
    return Number(wallet?.balance ?? 0);
  }

  async estimateOk(companyId: string, estimatedUnits: number) {
    const balance = await this.currentSmsBalance(companyId);
    return { balance, estimatedUnits, remaining: balance - estimatedUnits, ok: balance >= estimatedUnits };
  }

  async usedUnits(campaignId: string) {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(sms_parts), 0)::int AS used
       FROM sms_campaign_recipients
       WHERE campaign_id = $1
         AND status IN ('ACCEPTED', 'SENT', 'DELIVERED')`,
      [campaignId],
    );
    return Number(rows[0]?.used ?? 0);
  }

  async reserve(campaign: SmsCampaign, units: number, actorUserId?: string) {
    if (units <= 0) {
      throw new BadRequestException('Gönderilebilir alıcı yok');
    }
    if (campaign.reservedUnits > 0 && campaign.reservationTxId) {
      return campaign;
    }
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(SmsCampaign, {
        where: { id: campaign.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new BadRequestException('Kampanya bulunamadı');
      if (locked.reservedUnits > 0 && locked.reservationTxId) return locked;

      const wallet = await manager.findOne(Wallet, {
        where: { companyId: locked.senderCompanyId, walletType: WalletType.SMS },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new BadRequestException('SMS bakiyesi bulunamadı');
      }
      const before = Number(wallet.balance);
      if (before < units) {
        throw new BadRequestException(
          `Yetersiz SMS kredisi. Gerekli ${units}, mevcut ${before}. ${Math.ceil(units - before)} kredi daha yükleyin.`,
        );
      }
      const after = before - units;
      wallet.balance = after;
      await manager.save(wallet);
      const tx = await manager.save(
        manager.create(WalletTransaction, {
          walletId: wallet.id,
          transactionType: TransactionType.DEBIT,
          amount: -units,
          balanceBefore: before,
          balanceAfter: after,
          description: 'SMS kampanya rezervasyonu',
          referenceType: 'SMS_CAMPAIGN',
          referenceId: locked.id,
          createdBy: actorUserId,
        }),
      );
      locked.reservedUnits = units;
      locked.actualUnits = units;
      locked.reservationTxId = tx.id;
      return manager.save(locked);
    });
  }

  async reserveAdditional(campaign: SmsCampaign, extraUnits: number, actorUserId?: string) {
    if (extraUnits <= 0) return campaign;
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(SmsCampaign, {
        where: { id: campaign.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new BadRequestException('Kampanya bulunamadı');
      const wallet = await manager.findOne(Wallet, {
        where: { companyId: locked.senderCompanyId, walletType: WalletType.SMS },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new BadRequestException('SMS bakiyesi bulunamadı');
      }
      const before = Number(wallet.balance);
      if (before < extraUnits) {
        throw new BadRequestException(
          `Yetersiz SMS kredisi. Gerekli ek ${extraUnits}, mevcut ${before}.`,
        );
      }
      const after = before - extraUnits;
      wallet.balance = after;
      await manager.save(wallet);
      const tx = await manager.save(
        manager.create(WalletTransaction, {
          walletId: wallet.id,
          transactionType: TransactionType.DEBIT,
          amount: -extraUnits,
          balanceBefore: before,
          balanceAfter: after,
          description: 'SMS kampanya ek rezervasyon',
          referenceType: 'SMS_CAMPAIGN',
          referenceId: locked.id,
          createdBy: actorUserId,
        }),
      );
      locked.reservedUnits = (locked.reservedUnits || 0) + extraUnits;
      locked.reservationTxId = locked.reservationTxId ?? tx.id;
      return manager.save(locked);
    });
  }

  async refundUnused(campaign: SmsCampaign, usedUnits: number, actorUserId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(SmsCampaign, {
        where: { id: campaign.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || !locked.reservationTxId) return locked ?? campaign;
      const unused = Math.max(0, locked.reservedUnits - usedUnits);
      if (unused <= 0) return locked;
      const wallet = await manager.findOne(Wallet, {
        where: { companyId: locked.senderCompanyId, walletType: WalletType.SMS },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) return locked;
      const before = Number(wallet.balance);
      const after = before + unused;
      wallet.balance = after;
      await manager.save(wallet);
      await manager.save(
        manager.create(WalletTransaction, {
          walletId: wallet.id,
          transactionType: TransactionType.REFUND,
          amount: unused,
          balanceBefore: before,
          balanceAfter: after,
          description: 'Kullanılmayan SMS rezervasyonu iadesi',
          referenceType: 'SMS_CAMPAIGN',
          referenceId: locked.id,
          createdBy: actorUserId,
        }),
      );
      locked.reservedUnits = usedUnits;
      return manager.save(locked);
    });
  }

  async maybeRefundIfTerminal(campaignId: string, actorUserId?: string) {
    const campaign = await this.dataSource.getRepository(SmsCampaign).findOne({ where: { id: campaignId } });
    if (!campaign || !TERMINAL.includes(campaign.status)) return campaign;
    const used = await this.usedUnits(campaignId);
    return this.refundUnused(campaign, used, actorUserId);
  }
}
