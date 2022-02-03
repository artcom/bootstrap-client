import axios from "axios"
import {
  connect,
  ErrorCallback,
  HttpClient,
  MqttClient,
  unpublishRecursively,
} from "@artcom/mqtt-topping"
import { createLogger, Winston } from "@artcom/logger"

import { BootstrapData, InitData, Options, QueryConfig, QueryParams } from "./types"

export = async function init(
  url: string,
  serviceId: string,
  {
    timeout = 2000,
    retryDelay = 10000,
    debugBootstrapData = null,
    onParseError = null,
  }: Options = {},
): Promise<InitData> {
  const logger = createLogger()

  const data = await retrieveBootstrapData(url, timeout, retryDelay, logger, debugBootstrapData)

  return {
    logger,
    data,
    mqttClient: data.tcpBrokerUri ? connectMqttClient(serviceId, data, onParseError, logger) : null,
    httpClient: data.httpBrokerUri ? new HttpClient(data.httpBrokerUri) : null,
    queryConfig: data.configServerUri ? createQueryConfig(data.configServerUri) : null,
    unpublishRecursively: data.tcpBrokerUri && data.httpBrokerUri ? unpublishRecursively : null,
  }
}

async function retrieveBootstrapData(
  url: string,
  timeout: number,
  retryDelay: number,
  logger: Winston.Logger,
  debugBootstrapData: BootstrapData,
): Promise<BootstrapData> {
  if (debugBootstrapData) {
    logger.info("Using debug bootstrap data", { ...debugBootstrapData })

    return debugBootstrapData
  }

  if (!url) {
    const bootstrapData = {
      tcpBrokerUri: process.env.TCP_BROKER_URI,
      httpBrokerUri: process.env.HTTP_BROKER_URI,
      configServerUri: process.env.CONFIG_SERVER_URI,
      device: process.env.DEVICE,
    }

    logger.info("Using bootstrap data from environment", { ...bootstrapData })
    return bootstrapData
  }

  logger.info("Querying bootstrap data", { url })

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { data } = await axios.get(url, { timeout })
      logger.info("Bootstrap data received", { ...data })

      return data
    } catch (error) {
      logger.error(`Query failed. Retrying in ${retryDelay}ms...`, { error: error.message })

      await delay(retryDelay)
    }
  }
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

function connectMqttClient(
  serviceId: string,
  { device, tcpBrokerUri }: BootstrapData,
  onParseError: ErrorCallback,
  logger: Winston.Logger,
): MqttClient {
  const clientId = createClientId(serviceId, device)

  logger.info("Connecting to Broker", { tcpBrokerUri, clientId })
  const mqttClient = connect(tcpBrokerUri, { clientId, onParseError })

  mqttClient.on("connect", () => {
    logger.info("Connected to Broker")
  })
  mqttClient.on("close", () => {
    logger.error("Disconnected from Broker")
  })
  mqttClient.on("error", () => {
    logger.error("Error Connecting to Broker")
  })

  return mqttClient
}

function createClientId(serviceId: string, device?: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  if (device) {
    return `${serviceId}-${device}-${uuid}`
  } else {
    return `${serviceId}-${uuid}`
  }
}

function createQueryConfig(configServerUri: string): QueryConfig {
  return async (configPath: string, params: QueryParams = {}) => {
    const {
      version = "master",
      listFiles = false,
      includeCommitHash = false,
      parseJSON = true,
    } = params

    const query: any = {
      url: `${configServerUri}/${version}/${configPath}?listFiles=${listFiles}`,
      transformResponse: parseJSON ? undefined : [],
    }

    return axios(query).then((response) =>
      includeCommitHash
        ? { data: response.data, commitHash: response.headers["git-commit-hash"] }
        : response.data,
    )
  }
}
