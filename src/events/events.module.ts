import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { MqttGateway } from './mqtt.gateway';

@Global()
@Module({
  providers: [EventsGateway, MqttGateway],
  exports: [EventsGateway, MqttGateway],
})
export class EventsModule {}
