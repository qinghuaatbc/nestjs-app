import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateDeviceDto,
  DeviceService,
  UpdateDeviceDto,
} from './device.service';
import { EventsGateway } from '../events/events.gateway';
import { MqttGateway } from '../events/mqtt.gateway';

@Controller('api/devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly events: EventsGateway,
    private readonly mqtt: MqttGateway,
  ) {}

  @Get()
  findAll() {
    return this.deviceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deviceService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateDeviceDto) {
    const device = await this.deviceService.create(dto);
    this.events.emitDeviceEvent('created', device);
    this.mqtt.publishDeviceEvent('created', device);
    return device;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    const device = await this.deviceService.update(id, dto);
    this.events.emitDeviceEvent('updated', device);
    this.mqtt.publishDeviceEvent('updated', device);
    return device;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deviceService.remove(id);
    this.events.emitDeviceEvent('deleted', { id });
    this.mqtt.publishDeviceEvent('deleted', { id });
  }
}
