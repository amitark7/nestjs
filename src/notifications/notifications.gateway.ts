import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationsService,
  ) {}
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;

      client.join(`user:${userId}`);

      console.log(`User ${userId} connected`);

      const notifications =
        await this.notificationService.getUnreadNotifications(userId);

      client.emit('notifications:sync', notifications);
    } catch (error) {
      console.log('Invalid WebSocket authentication');

      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
  }

  sendNotification(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
