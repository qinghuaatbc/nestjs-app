import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './person.entity';

export class CreatePersonDto {
  name: string;
  age: number;
  hobby: string;
}

export class UpdatePersonDto {
  name?: string;
  age?: number;
  hobby?: string;
}

const SEED_PERSONS: CreatePersonDto[] = [
  { name: 'Alice', age: 28, hobby: 'Reading' },
  { name: 'Bob', age: 32, hobby: 'Cycling' },
  { name: 'Carol', age: 25, hobby: 'Photography' },
  { name: 'Dave', age: 40, hobby: 'Cooking' },
  { name: 'Eve', age: 22, hobby: 'Gaming' },
];

@Injectable()
export class PersonService implements OnModuleInit {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.personRepo.count();
    if (count === 0) {
      for (const dto of SEED_PERSONS) {
        await this.create(dto);
      }
    }
  }

  async findAll(): Promise<Person[]> {
    return this.personRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepo.findOne({ where: { id } });
    if (!person) throw new NotFoundException(`Person ${id} not found`);
    return person;
  }

  async create(dto: CreatePersonDto): Promise<Person> {
    const person = this.personRepo.create(dto);
    return this.personRepo.save(person);
  }

  async update(id: string, dto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);
    Object.assign(person, dto);
    return this.personRepo.save(person);
  }

  async remove(id: string): Promise<void> {
    const result = await this.personRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Person ${id} not found`);
  }
}
