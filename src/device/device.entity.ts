import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('device')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  location: string;

  @Column({ type: 'boolean', default: false })
  onOff: boolean;

  @Column({ type: 'int', default: 0 })
  level: number;
}
