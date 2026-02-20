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

  emitPersonEvent(action: 'list' | 'created' | 'updated' | 'deleted', payload: unknown) {
    this.server?.emit('person', { action, payload });
  }

  emitDeviceEvent(action: 'list' | 'created' | 'updated' | 'deleted', payload: unknown) {
    this.server?.emit('device', { action, payload });
  }
}
