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
  CreateCustomerDto,
  CustomerService,
  UpdateCustomerDto,
} from './customer.service';
import { EventsGateway } from '../events/events.gateway';
import { MqttGateway } from '../events/mqtt.gateway';

@Controller('api/customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly events: EventsGateway,
    private readonly mqtt: MqttGateway,
  ) {}

  @Get()
  findAll() {
    return this.customerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.customerService.create(dto);
    this.events.emitCustomerEvent('created', customer);
    this.mqtt.publishCustomerEvent('created', customer);
    return customer;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const customer = await this.customerService.update(id, dto);
    this.events.emitCustomerEvent('updated', customer);
    this.mqtt.publishCustomerEvent('updated', customer);
    return customer;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customerService.remove(id);
    this.events.emitCustomerEvent('deleted', { id });
    this.mqtt.publishCustomerEvent('deleted', { id });
  }
}
