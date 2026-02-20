import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';

const DEVICE_TOPIC = 'device';
const CUSTOMER_TOPIC = 'customer';

@Injectable()
export class MqttGateway implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;

  onModuleInit() {
    const url = process.env.MQTT_BROKER_URL;
    if (!url) return;
    try {
      this.client = mqtt.connect(url, {
        clientId: 'nestjs-app-' + Math.random().toString(16).slice(2, 10),
        clean: true,
        reconnectPeriod: 5000,
      });
      this.client.on('error', (err) => console.error('[MQTT]', err.message));
      this.client.on('connect', () => console.log('[MQTT] Connected to', url));
    } catch (err) {
      console.error('[MQTT] Connect failed', err);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }

  publishDeviceEvent(
    action: 'created' | 'updated' | 'deleted',
    payload: unknown,
  ): void {
    if (!this.client?.connected) return;
    const message = JSON.stringify({ action, payload });
    this.client.publish(DEVICE_TOPIC, message, { qos: 0 });
  }

  publishCustomerEvent(
    action: 'created' | 'updated' | 'deleted',
    payload: unknown,
  ): void {
    if (!this.client?.connected) return;
    const message = JSON.stringify({ action, payload });
    this.client.publish(CUSTOMER_TOPIC, message, { qos: 0 });
  }
}
