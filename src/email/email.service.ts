import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { taskReminderTemplate } from './templates/task-reminder.template';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,

      auth: {
        user: this.configService.get<string>('MAIL_USER'),

        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendTaskReminderEmail(to: string, taskId: number, message: string) {
    const result = await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),

      to,

      subject: `🔔 Task #${taskId} Reminder`,

      text: message,

      html: taskReminderTemplate(taskId, message),
    });

    return {
      messageId: result.messageId,
    };
  }

  async sendTestEmail() {
    const result = await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),

      to: 'amitkum@izooto.com',

      subject: 'NestJS Test Email',

      text: 'Hello! Email notification is working.',

      html: `
          <h2>🔔 Email Notification</h2>

          <p>
            Hello! Your NestJS email notification
            system is working.
          </p>
        `,
    });

    return {
      message: 'Email sent successfully',
      messageId: result.messageId,
    };
  }
}
