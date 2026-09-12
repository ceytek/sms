import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { CompanyStatus } from '../../common/enums/company-status.enum.js';
import { CompanyType } from '../../common/enums/company-type.enum.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  async login(loginDto: LoginDto) {
    const { companyCode, username, password } = loginDto;

    const company = await this.companyRepository.findOne({
      where: { companyCode },
    });

    if (!company) {
      throw new UnauthorizedException(
        'Geçersiz firma kodu, kullanıcı adı veya parola',
      );
    }

    if (company.status !== CompanyStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Hesabınız pasife alınmıştır. Lütfen firma ile iletişime geçin.',
      );
    }

    if (company.dealerCompanyId) {
      const dealer = await this.companyRepository.findOne({
        where: { id: company.dealerCompanyId },
      });
      if (dealer && dealer.status !== CompanyStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Bir hata oluştu. Lütfen yönetici ile iletişime geçin.',
        );
      }
    }

    let user = await this.userRepository.findOne({
      where: { companyId: company.id, username },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { companyCode, username, companyId: IsNull() },
      });

      if (user) {
        user.companyId = company.id;
        await this.userRepository.save(user);
      }
    }

    if (!user) {
      throw new UnauthorizedException(
        'Geçersiz firma kodu, kullanıcı adı veya parola',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Hesabınız pasife alınmıştır. Lütfen firma ile iletişime geçin.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Geçersiz firma kodu, kullanıcı adı veya parola',
      );
    }

    const payload = {
      sub: user.id,
      companyCode: user.companyCode,
      companyId: company.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        companyId: company.id,
        companyCode: user.companyCode,
        username: user.username,
        role: user.role,
      },
    };
  }

  async impersonate(
    companyId: string,
    actor: { id: string; role: string; companyId: string },
  ) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    if (company.id === actor.companyId) {
      throw new ForbiddenException('Kendi hesabınıza bu şekilde giriş yapamazsınız');
    }

    if (company.status !== CompanyStatus.ACTIVE) {
      throw new ForbiddenException('Pasif firmaya giriş yapılamaz');
    }

    if (actor.role === 'DEALER') {
      if (company.dealerCompanyId !== actor.companyId) {
        throw new ForbiddenException('Bu firmaya erişim yetkiniz yok');
      }
    }

    const user = await this.userRepository.findOne({
      where: { companyId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!user) {
      throw new NotFoundException('Bu firmaya ait aktif kullanıcı bulunamadı');
    }

    const payload = {
      sub: user.id,
      companyCode: company.companyCode,
      companyId: company.id,
      username: user.username,
      role: user.role,
      impersonatedBy: actor.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        companyId: company.id,
        companyCode: company.companyCode,
        username: user.username,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    return {
      id: user.id,
      companyId: user.companyId,
      companyCode: user.companyCode,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private async seedUsers() {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      this.logger.log('Kullanıcılar zaten mevcut, seed atlanıyor');
      return;
    }

    this.logger.log('Test firmaları ve kullanıcıları oluşturuluyor...');

    const testCompany = this.companyRepository.create({
      companyCode: 'TEST001',
      name: 'Test Müşteri',
      companyType: CompanyType.CORPORATE,
      status: CompanyStatus.ACTIVE,
    });
    const adminCompany = this.companyRepository.create({
      companyCode: 'ADMIN',
      name: 'Platform Admin',
      companyType: CompanyType.CORPORATE,
      status: CompanyStatus.ACTIVE,
    });

    const savedTestCompany = await this.companyRepository.save(testCompany);
    const savedAdminCompany = await this.companyRepository.save(adminCompany);

    const testUsers = [
      {
        companyId: savedTestCompany.id,
        companyCode: 'TEST001',
        username: 'musteri',
        passwordHash: await bcrypt.hash('123456', 10),
        role: Role.CUSTOMER,
      },
      {
        companyId: savedAdminCompany.id,
        companyCode: 'ADMIN',
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: Role.ADMIN,
      },
    ];

    for (const userData of testUsers) {
      const user = this.userRepository.create(userData);
      await this.userRepository.save(user);
    }

    this.logger.log('Test firmaları ve kullanıcıları oluşturuldu');
  }
}
