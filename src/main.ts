import axios from "axios"
import topping, { ClientWrapper } from "mqtt-topping"
import * as Logger from "bunyan"

const QUERY_TIMEOUT = 2000
const QUERY_RETRY_DELAY = 1000

type BootstrapData = {
  backendHost: string,
  configServerUri: string,
  device: string,
  deviceTopic: string,
  httpBrokerUri: string,
  tcpBrokerUri: string,
  wsBrokerUri: string,
}

type QueryConfig = (configPath : string) => any

type InitData = {
  logger: Logger,
  mqttClient: ClientWrapper,
  queryConfig: QueryConfig,
  bootstrapData: BootstrapData
}

export = async function init(bootstrapUrl: string, serviceId: string) : Promise<InitData> {
  const logger = Logger.createLogger({
    name: serviceId,
    level: "debug",
    serializers: { error: Logger.stdSerializers.err }
  })

  logger.info({ bootstrapUrl }, "Retrieving bootstrap data from server")
  const bootstrapData = await queryBootstrapData(bootstrapUrl)
  logger.info(bootstrapData, "Bootstrap data retrieved from server")

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

  async function queryConfig(configPath: string, version: string = "master") {
    return axios(`${configServerUri}/${version}/${configPath}`)
  }

  return { logger, mqttClient, queryConfig, bootstrapData }
}

async function queryBootstrapData(url: string): Promise<BootstrapData> {
  try {
    const response = await axios.get(url, { timeout: QUERY_TIMEOUT })
    return response.data
  } catch (e) {
    await delay(QUERY_RETRY_DELAY)
    return await queryBootstrapData(url)
  }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function createClientId(serviceId: string, device: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  return `${serviceId}-${device}-${uuid}`
}
