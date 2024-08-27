export const green = (message: string) => `\x1b[32m${message}\x1b[0m`;

export const log = (message: string) => {
  if (process.env.DEBUG_OUTPUT) {
    console.log(green(`[DEBUG]: ${message}`));
  }
};
