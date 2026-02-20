import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { Zone } from './zone.entity';

export class ZoneDto {
  zoneNumber: string;
  zoneName?: string;
}

export class CreateCustomerDto {
  name?: string;
  address?: string;
  city?: string;
  panel?: string | null;
  zonelist?: ZoneDto[];
}

export class UpdateCustomerDto {
  name?: string;
  address?: string;
  city?: string;
  panel?: string | null;
  zonelist?: ZoneDto[];
}

const SEED_CUSTOMERS: CreateCustomerDto[] = [
  {
    name: 'Acme Corp',
    address: '123 Main St',
    city: 'Boston',
    panel: 'PANEL-001',
    zonelist: [
      { zoneNumber: '1', zoneName: 'Front Door' },
      { zoneNumber: '2', zoneName: 'Living Room' },
      { zoneNumber: '3', zoneName: 'Back Yard' },
    ],
  },
  {
    name: 'Tech Solutions Ltd',
    address: '456 Oak Ave',
    city: 'San Francisco',
    panel: 'PANEL-002',
    zonelist: [
      { zoneNumber: '1', zoneName: 'Reception' },
      { zoneNumber: '2', zoneName: 'Server Room' },
    ],
  },
  {
    name: 'Home Security Inc',
    address: '789 Pine Rd',
    city: 'Seattle',
    panel: null,
    zonelist: [
      { zoneNumber: '1', zoneName: 'Garage' },
      { zoneNumber: '2', zoneName: 'Basement' },
    ],
  },
];

@Injectable()
export class CustomerService implements OnModuleInit {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.customerRepo.count();
    if (count === 0) {
      for (const dto of SEED_CUSTOMERS) {
        await this.create(dto);
      }
    }
  }

  async findAll(): Promise<Customer[]> {
    return this.customerRepo.find({
      relations: { zonelist: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: { zonelist: true },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepo.create({
      name: dto.name ?? '',
      address: dto.address ?? '',
      city: dto.city ?? '',
      panel: dto.panel ?? null,
    });
    const saved = await this.customerRepo.save(customer);
    if (dto.zonelist && dto.zonelist.length > 0) {
      await this.saveZonelist(saved.id, dto.zonelist);
    }
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.address !== undefined) customer.address = dto.address;
    if (dto.city !== undefined) customer.city = dto.city;
    if (dto.panel !== undefined) customer.panel = dto.panel;
    await this.customerRepo.save(customer);
    if (dto.zonelist !== undefined) {
      await this.zoneRepo.delete({ customer: { id } });
      if (dto.zonelist.length > 0) {
        await this.saveZonelist(id, dto.zonelist);
      }
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.customerRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Customer ${id} not found`);
  }

  private async saveZonelist(customerId: string, list: ZoneDto[]): Promise<void> {
    const zones = list.map((z) =>
      this.zoneRepo.create({
        customer: { id: customerId },
        zoneNumber: z.zoneNumber ?? '',
        zoneName: (z.zoneName ?? '').trim(),
      }),
    );
    await this.zoneRepo.save(zones);
  }
}
