import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class ApiController {
  constructor(private readonly appService: AppService) {}

  @Get('info')
  async getInfo() {
    return this.appService.getIpInfo();
  }
}
