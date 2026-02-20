import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('person')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', default: 0 })
  age: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  hobby: string;
}
