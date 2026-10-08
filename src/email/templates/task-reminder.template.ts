export function taskReminderTemplate(taskId: number, message: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <div style="
          max-width: 600px;
          margin: auto;
          padding: 30px;
          font-family: Arial, sans-serif;
        ">

          <h2>🔔 Task Reminder</h2>

          <p>
            ${message}
          </p>

          <p>
            <strong>Task ID:</strong> ${taskId}
          </p>

          <p>
            Your task is due soon.
          </p>

        </div>
      </body>
    </html>
  `;
}
