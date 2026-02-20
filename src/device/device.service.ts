import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';

export class CreateDeviceDto {
  name: string;
  location?: string;
  onOff?: boolean;
  level?: number;
}

export class UpdateDeviceDto {
  name?: string;
  location?: string;
  onOff?: boolean;
  level?: number;
}

const SEED_DEVICES: CreateDeviceDto[] = [
  { name: 'Living Room Light', location: 'Living Room', onOff: true, level: 80 },
  { name: 'Bedroom AC', location: 'Bedroom', onOff: false, level: 0 },
  { name: 'Kitchen Speaker', location: 'Kitchen', onOff: true, level: 50 },
  { name: 'Garage Door', location: 'Garage', onOff: false, level: 0 },
  { name: 'Thermostat', location: 'Hallway', onOff: true, level: 72 },
];

@Injectable()
export class DeviceService implements OnModuleInit {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.deviceRepo.count();
    if (count === 0) {
      for (const dto of SEED_DEVICES) {
        await this.create(dto);
      }
    }
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    return device;
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepo.create({
      name: dto.name,
      location: dto.location ?? '',
      onOff: dto.onOff ?? false,
      level: dto.level ?? 0,
    });
    return this.deviceRepo.save(device);
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);
    Object.assign(device, dto);
    return this.deviceRepo.save(device);
  }

  async remove(id: string): Promise<void> {
    const result = await this.deviceRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Device ${id} not found`);
  }
}
