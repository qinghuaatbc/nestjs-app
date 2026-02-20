import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection() {
    // client connected
  }

  handleDisconnect() {
    // client disconnected
  }

  emitDeviceEvent(action: 'list' | 'created' | 'updated' | 'deleted', payload: unknown) {
    this.server?.emit('device', { action, payload });
  }

  emitCustomerEvent(action: 'list' | 'created' | 'updated' | 'deleted', payload: unknown) {
    this.server?.emit('customer', { action, payload });
  }
}
