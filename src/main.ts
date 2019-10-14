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

type QueryConfig = (configPath: string) => any

type InitData = {
  logger: Logger,
  mqttClient: ClientWrapper,
  queryConfig: QueryConfig,
  data: BootstrapData
}

type Options = {
  timeout?: number,
  retryDelay?: number
}

export = async function init(
  url: string,
  serviceId: string,
  { timeout = 2000, retryDelay = 10000 }: Options = {}
): Promise<InitData> {
  const logger = Logger.createLogger({
    name: serviceId,
    level: "debug",
    serializers: { error: Logger.stdSerializers.err }
  })

  async function query(): Promise<BootstrapData> {
    logger.info({ url }, "Querying bootstrap data")
    try {
      const response = await axios.get(url, { timeout })
      return response.data
    } catch (error) {
      logger.error({ error: error.message }, `Query failed. Retrying in ${retryDelay}ms...`)
      await delay(retryDelay)
      return await query()
    }
  }

  const data = await query()
  logger.info({ data }, "Bootstrap data received")

  const {
    device,
    tcpBrokerUri,
    httpBrokerUri,
    configServerUri
  } = data

  const clientId = createClientId(serviceId, device)
  logger.info({ tcpBrokerUri, httpBrokerUri, clientId }, "Connecting to Broker")
  const mqttClient = topping.connect(tcpBrokerUri, httpBrokerUri, { clientId })

  mqttClient.on("connect", () => { logger.info("Connected to Broker") })
  mqttClient.on("close", () => { logger.error("Disconnected from Broker") })
  mqttClient.on("error", () => { logger.error("Error Connecting to Broker") })

  async function queryConfig(configPath: string, version: string = "master") {
    return axios(`${configServerUri}/${version}/${configPath}`)
  }

  return { logger, mqttClient, queryConfig, data }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function createClientId(serviceId: string, device: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  return `${serviceId}-${device}-${uuid}`
}
