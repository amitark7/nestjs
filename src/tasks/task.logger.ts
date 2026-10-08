export class TaskLogger {
  log(msg: string, payload?: any) {
    if (payload) {
      console.log(`[LOG] ${msg} : `, payload);
    } else {
      console.log(`[LOG] ${msg}`);
    }
  }
}
