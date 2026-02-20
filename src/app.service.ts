import { Injectable } from '@nestjs/common';
import { networkInterfaces } from 'os';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getLocalIps(): string[] {
    try {
      const ips: string[] = [];
      const ifaces = networkInterfaces();
      for (const name of Object.keys(ifaces)) {
        const addrs = ifaces[name];
        if (!addrs) continue;
        for (const a of addrs) {
          if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
        }
      }
      return ips.length ? ips : ['127.0.0.1'];
    } catch {
      return ['127.0.0.1'];
    }
  }

  async getPublicIp(): Promise<string | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('https://api.ipify.org?format=json', {
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = (await res.json()) as { ip?: string };
      return data.ip ?? null;
    } catch {
      return null;
    }
  }

  async getIpInfo(): Promise<{ local: string[]; public: string | null }> {
    try {
      const local = this.getLocalIps();
      const publicIp = await this.getPublicIp();
      return { local, public: publicIp };
    } catch {
      return { local: this.getLocalIps(), public: null };
    }
  }
}
