# Bootstrap Client

Queries bootstrap data from the [bootstrap server](https://github.com/artcom/bootstrap-server) and initializes an MQTT client and a logger for services.

## Usage

Install this library via npm:
```bash
npm install @artcom/bootstrap-client
```

Bootstrap as follows:
```javascript
const bootstrap = require("@artcom/bootstrap-client")

bootstrap(bootstrapUrl, serviceId).then(async ({ logger, mqttClient, queryConfig, data }) => {
  // log something
  logger.info("Hello world!")

  // publish "bar" to topic "foo"
  mqttClient.publish("foo", "bar")

  // query some configurations
  const myConfig = await queryConfig("config/path")

  // use raw bootstrap data
  logger.info(`I am running on device: ${data.device}`)
})
```
The following additional options are supported:
* `timeout`: is the time in milliseconds until the query times out, default: `2000`
* `retryDelay`: is the time in milliseconds until the query is sent again, default: `10000`
* `debugBootstrapData`: can be set to skip querying data from the [bootstrap server](https://github.com/artcom/bootstrap-server) for debugging, default: `null`

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
