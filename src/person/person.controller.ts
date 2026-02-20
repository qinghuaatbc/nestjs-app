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
  CreatePersonDto,
  PersonService,
  UpdatePersonDto,
} from './person.service';
import { EventsGateway } from '../events/events.gateway';
import { MqttGateway } from '../events/mqtt.gateway';

@Controller('api/persons')
export class PersonController {
  constructor(
    private readonly personService: PersonService,
    private readonly events: EventsGateway,
    private readonly mqtt: MqttGateway,
  ) {}

  @Get()
  findAll() {
    return this.personService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePersonDto) {
    const person = await this.personService.create(dto);
    this.events.emitPersonEvent('created', person);
    this.mqtt.publishPersonEvent('created', person);
    return person;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
    const person = await this.personService.update(id, dto);
    this.events.emitPersonEvent('updated', person);
    this.mqtt.publishPersonEvent('updated', person);
    return person;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.personService.remove(id);
    this.events.emitPersonEvent('deleted', { id });
    this.mqtt.publishPersonEvent('deleted', { id });
  }
}
