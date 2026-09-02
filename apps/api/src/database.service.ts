import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ping(): Promise<boolean> {
    const result = await this.prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    return result[0]?.ok === 1;
  }
}
