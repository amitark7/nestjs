import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaBaseline1791180000000 implements MigrationInterface {
  name = 'InitialSchemaBaseline1791180000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Baseline only.
    // The current database already contains this schema.
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty.
    // This baseline must not destroy the existing schema.
  }
}
