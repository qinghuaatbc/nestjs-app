import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ApiController } from './api.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CustomerModule } from './customer/customer.module';
import { DeviceModule } from './device/device.module';
import { EventsModule } from './events/events.module';
import { FilesModule } from './files/files.module';
@Module({
  imports: [
    AuthModule,
    EventsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'nest',
      password: process.env.DB_PASSWORD || 'nest',
      database: process.env.DB_NAME || 'nestdb',
      autoLoadEntities: true,
      synchronize: true,
    }),
    DeviceModule,
    CustomerModule,
    ChatModule,
    FilesModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/s',
    }),
  ],
  controllers: [AppController, ApiController],
  providers: [AppService],
})
export class AppModule {}
