import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/s/index.html', 302)
  getRoot(): string {
    return this.appService.getHello();
  }

  @Get('player.html')
  @Redirect('/s/player.html', 302)
  redirectPlayer() {}

  @Get('files.html')
  @Redirect('/s/files.html', 302)
  redirectFiles() {}

  @Get('media.html')
  @Redirect('/s/media.html', 302)
  redirectMedia() {}

  @Get('rest-test.html')
  @Redirect('/s/rest-test.html', 302)
  redirectRestTest() {}

  @Get('websocket-test.html')
  @Redirect('/s/websocket-test.html', 302)
  redirectWebsocketTest() {}

  @Get('mqtt-test.html')
  @Redirect('/s/mqtt-test.html', 302)
  redirectMqttTest() {}

  @Get('viewer-3d.html')
  @Redirect('/s/viewer-3d.html', 302)
  redirectViewer3d() {}

  @Get('chat.html')
  @Redirect('/s/chat.html', 302)
  redirectChat() {}
}
