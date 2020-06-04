import axios from "axios"
import topping, { ClientWrapper } from "mqtt-topping"
import { createLogger, Winston } from "@artcom/logger"

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
  logger: Winston.Logger,
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
  const logger = createLogger()

  async function query(): Promise<BootstrapData> {
    logger.info("Querying bootstrap data", { url })
    try {
      const response = await axios.get(url, { timeout })
      return response.data
    } catch (error) {
      logger.error(`Query failed. Retrying in ${retryDelay}ms...`, { error: error.message })
      await delay(retryDelay)
      return await query()
    }
  }

  const bootstrapData = await query()
  logger.info("Bootstrap data received", { ...bootstrapData })

  const {
    device,
    tcpBrokerUri,
    httpBrokerUri,
    configServerUri
  } = bootstrapData

  const clientId = createClientId(serviceId, device)
  logger.info("Connecting to Broker", { tcpBrokerUri, httpBrokerUri, clientId })
  const mqttClient = topping.connect(tcpBrokerUri, httpBrokerUri, { clientId })

  mqttClient.on("connect", () => { logger.info("Connected to Broker") })
  mqttClient.on("close", () => { logger.error("Disconnected from Broker") })
  mqttClient.on("error", () => { logger.error("Error Connecting to Broker") })

  async function queryConfig(configPath: string, version: string = "master") {
    return axios(`${configServerUri}/${version}/${configPath}`).then(({ data }) => data)
  }

  return { logger, mqttClient, queryConfig, data: bootstrapData }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function createClientId(serviceId: string, device: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  return `${serviceId}-${device}-${uuid}`
}
