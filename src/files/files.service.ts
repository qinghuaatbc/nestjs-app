import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtime?: string;
}

@Injectable()
export class FilesService {
  private readonly basePath: string;

  constructor() {
    this.basePath = resolve(process.cwd(), 'files');
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  private resolvePath(relativePath: string): string {
    const path = resolve(this.basePath, relativePath || '.');
    if (!path.startsWith(this.basePath)) {
      throw new Error('Invalid path');
    }
    return path;
  }

  async listDir(relativePath = ''): Promise<FileEntry[]> {
    const dirPath = this.resolvePath(relativePath);
    const entries = await readdir(dirPath, { withFileTypes: true });
    const result: FileEntry[] = [];
    for (const e of entries) {
      const subPath = relativePath ? `${relativePath}/${e.name}` : e.name;
      try {
        const stat = statSync(join(dirPath, e.name));
        result.push({
          name: e.name,
          path: subPath,
          isDir: e.isDirectory(),
          size: stat.isFile() ? stat.size : undefined,
          mtime: stat.mtime?.toISOString(),
        });
      } catch {
        result.push({
          name: e.name,
          path: subPath,
          isDir: e.isDirectory(),
        });
      }
    }
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  }

  getFileStream(relativePath: string) {
    const filePath = this.resolvePath(relativePath);
    return createReadStream(filePath);
  }

  getFileStat(relativePath: string) {
    const filePath = this.resolvePath(relativePath);
    return statSync(filePath);
  }
}
