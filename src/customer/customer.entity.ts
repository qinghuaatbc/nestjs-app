import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zone } from './zone.entity';

@Entity('customer')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  name: string;

  @Column({ type: 'varchar', length: 512, default: '' })
  address: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  city: string;

  /** Alarm section: panel identifier */
  @Column({ type: 'varchar', length: 128, nullable: true })
  panel: string | null;

  /** Alarm section: list of zones (zone number + zone name) */
  @OneToMany(() => Zone, (z) => z.customer, { cascade: true })
  zonelist: Zone[];
}
