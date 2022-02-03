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
    mqttClient: connectMqttClient(serviceId, data, onParseError, logger),
    httpClient: new HttpClient(data.httpBrokerUri),
    queryConfig: createQueryConfig(data.configServerUri),
    unpublishRecursively,
  }
}

async function retrieveBootstrapData(
  url: string,
  timeout: number,
  retryDelay: number,
  logger: Winston.Logger,
  debugBootstrapData: BootstrapData
) : Promise<BootstrapData> {
  if (debugBootstrapData) {
    logger.info("Using debug bootstrap data", { ...debugBootstrapData })

    return debugBootstrapData
  } else {
    logger.info("Querying bootstrap data", { url })

    while (true) { // eslint-disable-line no-constant-condition
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

function createClientId(serviceId: string, device: string) {
  const uuid = Math.random().toString(16).substr(2, 8)
  return `${serviceId}-${device}-${uuid}`
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
