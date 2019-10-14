# Bootstrap Client

Queries bootstrap data from a bootstrap server and initializes an MQTT client and a logger for services.

# Usage

Install this library via npm:
```bash
npm install @artcom/bootstrap-client
```

Bootstrap as follows:
```javascript
const bootstrap = require("@artcom/bootstrap-client")

bootstrap(bootstrapUri, serviceId).then(async ({ logger, mqttClient, queryConfig, bootstrapData }) => {
  // log something
  logger.info("Hello world!")

  // publish "bar" to topic "foo"
  mqttClient.publish("foo", "bar")

  // query some configurations
  const myConfig = await queryConfig("config/path")

  // use raw bootstrap data
  logger.info(`I am running on device: ${bootstrapData.device}`)
})
```
