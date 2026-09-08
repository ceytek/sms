import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { Role } from '../../common/enums/role.enum.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  async login(loginDto: LoginDto) {
    const { companyCode, username, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { companyCode, username, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Geçersiz firma kodu, kullanıcı adı veya parola');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz firma kodu, kullanıcı adı veya parola');
    }

    const payload = {
      sub: user.id,
      companyCode: user.companyCode,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        companyCode: user.companyCode,
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
      companyCode: user.companyCode,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private async seedUsers() {
    const count = await this.userRepository.count();
    if (count > 0) {
      this.logger.log('Kullanıcılar zaten mevcut, seed atlanıyor');
      return;
    }

    this.logger.log('Test kullanıcıları oluşturuluyor...');

    const testUsers = [
      {
        companyCode: 'TEST001',
        username: 'musteri',
        passwordHash: await bcrypt.hash('123456', 10),
        role: Role.CUSTOMER,
      },
      {
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

    this.logger.log('Test kullanıcıları oluşturuldu');
  }
}
