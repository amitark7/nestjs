import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Attachment } from 'src/attachments/attachment.entity';
import { Tasks } from 'src/tasks/tasks.entity';
import { Users } from 'src/users/user.entity';
import { Notification } from 'src/notifications/entities/notification.entity';

export default new DataSource({
  type: 'mysql',

  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,

  entities: [Tasks, Users, Attachment, Notification],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
