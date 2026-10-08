import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskNotificationIndexes1791200788648 implements MigrationInterface {
    name = 'AddTaskNotificationIndexes1791200788648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_166bd96559cb38595d392f75a3\` ON \`tasks\``);
        await queryRunner.query(`CREATE INDEX \`IDX_b51eb9b6f0f8fb6f5acd06b5ca\` ON \`tasks\` (\`userId\`, \`priority\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_834b57735f213c3c2d642baf98\` ON \`tasks\` (\`userId\`, \`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_a7bd8c3a3432332819504723cb\` ON \`notification\` (\`userId\`, \`isRead\`, \`createdAt\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_a7bd8c3a3432332819504723cb\` ON \`notification\``);
        await queryRunner.query(`DROP INDEX \`IDX_834b57735f213c3c2d642baf98\` ON \`tasks\``);
        await queryRunner.query(`DROP INDEX \`IDX_b51eb9b6f0f8fb6f5acd06b5ca\` ON \`tasks\``);
        await queryRunner.query(`CREATE INDEX \`IDX_166bd96559cb38595d392f75a3\` ON \`tasks\` (\`userId\`)`);
    }

}
