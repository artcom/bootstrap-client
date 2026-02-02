# Bootstrap Client

Queries bootstrap data from the [bootstrap server](https://github.com/artcom/bootstrap-server) and initializes an MQTT client and a logger for services.

## Usage

Install this library via npm:

```bash
npm install @artcom/bootstrap-client
```

Bootstrap as follows:

```typescript
import { init, subscribeToConfigChange } from "@artcom/bootstrap-client"

const { logger, mqttClient, queryConfig, data } = await init(bootstrapUrl, serviceId)

// log something
logger.info("Hello world!")

// publish "bar" to topic "foo"
mqttClient.publish("foo", "bar")

// query some configurations with (optional) options
const myConfig = await queryConfig("config/path", { version: "master", listFiles: false, includeCommitHash = false, parseJSON = true })

// use raw bootstrap data
logger.info(`I am running on device: ${data.device}`)

// subscribe to configuration changes
subscribeToConfigChange(
  mqttClient,
  "device/config/changes", // The topic to listen on
  ["config.json", "assets/"], // Watch specific files or directories
  "master", // The config version to match
  async () => {
    logger.info("Configuration changed, reloading...")
  }
)
```

The following additional options are supported:

- `timeout`: is the time in milliseconds until the query times out, default: `2000`
- `retryDelay`: is the time in milliseconds until the query is sent again, default: `10000`
- `debugBootstrapData`: can be set to skip querying data from the [bootstrap server](https://github.com/artcom/bootstrap-server) for debugging, default: `null`

## Bootstrap Data

The client expects the following properties in the [bootstrap server](https://github.com/artcom/bootstrap-server) response or `debugBootstrapData`:

```typescript
{
  tcpBrokerUri: string,
  httpBrokerUri: string,
  configServerUri: string,
  device: string
}
```

Checkout the [bootstrap server](https://github.com/artcom/bootstrap-server) documentation for details.
