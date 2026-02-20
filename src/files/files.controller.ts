import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';

@Controller('api/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('list')
  async list(@Query('path') path?: string) {
    return this.filesService.listDir(path || '');
  }

  @Get('download')
  download(@Query('path') path: string, @Res({ passthrough: true }) res: Response) {
    if (!path) {
      res.status(400).send('Missing path');
      return;
    }
    try {
      const stat = this.filesService.getFileStat(path);
      if (!stat.isFile()) {
        res.status(400).send('Not a file');
        return;
      }
      const name = path.split('/').pop() || 'download';
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'Content-Length': stat.size,
      });
      return new StreamableFile(this.filesService.getFileStream(path));
    } catch {
      res.status(404).send('Not found');
      return;
    }
  }

  @Get('stream')
  stream(@Query('path') path: string, @Res({ passthrough: true }) res: Response) {
    if (!path) {
      res.status(400).send('Missing path');
      return;
    }
    try {
      const stat = this.filesService.getFileStat(path);
      if (!stat.isFile()) {
        res.status(400).send('Not a file');
        return;
      }
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const mime: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogv: 'video/ogg',
        m4v: 'video/x-m4v',
        m3u8: 'application/vnd.apple.mpegurl',
        pdf: 'application/pdf',
      };
      res.set({
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Content-Length': stat.size,
      });
      return new StreamableFile(this.filesService.getFileStream(path));
    } catch {
      res.status(404).send('Not found');
      return;
    }
  }
}
