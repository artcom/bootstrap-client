import axios from "axios"
import topping, { ClientWrapper } from "mqtt-topping"
import * as Logger from "bunyan"

type BootstrapData = {
  backendHost: string,
  configServerUri: string,
  device: string,
  deviceTopic: string,
  httpBrokerUri: string,
  tcpBrokerUri: string,
  wsBrokerUri: string,
}

type QueryConfig = (config : string) => any

type Init = {
  logger: Logger,
  mqttClient: ClientWrapper,
  queryConfig: QueryConfig,
  bootstrapData: BootstrapData
}

export default async function init(serviceId: string) : Promise<Init> {
  const logger = createLogger(serviceId)
  const bootstrapData = await getBootstrapData(logger)

  const {
    device,
    tcpBrokerUri,
    httpBrokerUri,
    configServerUri
  } = bootstrapData

  const clientId = createClientId(serviceId, device)
  logger.info({ tcpBrokerUri, httpBrokerUri, clientId }, "Connecting to Broker")
  const mqttClient = topping.connect(tcpBrokerUri, httpBrokerUri, { clientId })

  mqttClient.on("connect", () => { logger.info("Connected to Broker") })
  mqttClient.on("close", () => { logger.error("Disconnected from Broker") })
  mqttClient.on("error", () => { logger.error("Error Connecting to Broker") })

  async function queryConfig(config: string) {
    return axios(`${configServerUri}/master/${config}`)
  }

  return { logger, mqttClient, queryConfig, bootstrapData }
}

function createLogger(serviceId: string) : Logger {
  return Logger.createLogger({
    name: serviceId,
    level: "debug",
    serializers: { error: Logger.stdSerializers.err }
  })
}

async function getBootstrapData(logger: Logger) : Promise<BootstrapData> {
  const bootstrapUrl = process.env.BOOTSTRAP_SERVER_URI
  logger.info({ bootstrapUrl }, "Retrieving bootstrap data from server")
  const bootstrapData = await queryBootstrapData(bootstrapUrl)
  logger.info(bootstrapData, "Bootstrap data retrieved from server")
  return bootstrapData
}

async function queryBootstrapData(url: string): Promise<BootstrapData> {
  try {
    const response = await axios.get(url, { timeout: 2000 })
    return response.data
  } catch (e) {
    await delay(1000)
    return await queryBootstrapData(url)
  }
}

function delay(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

function createClientId(serviceId: string, device: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  if (device) {
    return `${serviceId}-${device}-${uuid}`
  } else {
    return `${serviceId}-${uuid}`
  }
}
