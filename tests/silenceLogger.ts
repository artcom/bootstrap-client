import { Winston } from "@artcom/logger"

// the logger has no silent switch; swallow console transport output so test results stay readable
Winston.transports.Console.prototype.log = (_info: unknown, callback: () => void) => {
  callback()
}
