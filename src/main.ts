import { HttpClient, MqttClient } from "@artcom/mqtt-topping"
import type { MessageCallback } from "@artcom/mqtt-topping"
import { createLogger } from "@artcom/logger"
import type { Winston } from "@artcom/logger"

import type * as Types from "./types.js"

export * from "./types.js"

export async function init<T extends Types.BootstrapData = Types.BootstrapData>(
  url: string,
  serviceId: string,
  {
    timeout = 2000,
    retryDelay = 10000,
    debugBootstrapData = undefined,
    mqttOptions = undefined,
  }: Types.Options = {},
): Promise<Types.InitData<T>> {
  const logger = createLogger()

  const data = (await retrieveBootstrapData(
    url,
    timeout,
    retryDelay,
    logger,
    debugBootstrapData,
  )) as T

  if (!data.tcpBrokerUri) {
    throw new Error("Bootstrap data does not contain a tcpBrokerUri")
  }

  return {
    logger,
    data,
    mqttClient: await connectMqttClient(
      serviceId,
      data.tcpBrokerUri,
      data.device,
      logger,
      mqttOptions,
    ),
    httpClient: data.httpBrokerUri ? new HttpClient(data.httpBrokerUri) : undefined,
    queryConfig: data.configServerUri ? createQueryConfig(data.configServerUri) : undefined,
  } as Types.InitData<T>
}

export function subscribeToConfigChange(
  mqttClient: MqttClient,
  configurationChangeTopic: string,
  watchPaths: string[],
  configVersion: string,
  updateHandler: (() => Promise<void>) | (() => void),
) {
  const subscriptionHandler: MessageCallback = async (payload: unknown) => {
    const configPayload = payload as Types.ConfigurationChangePayload
    const changedFiles = configPayload?.changedFiles || []
    const refName = configPayload?.refName || ""

    if (refName === `refs/heads/${configVersion}` && areFilesAffected(changedFiles, watchPaths)) {
      await updateHandler()
    }
  }

  mqttClient.subscribe(configurationChangeTopic, subscriptionHandler)
}

function areFilesAffected(filenames: string[], watchPaths: string[]) {
  return filenames.some((filename) => {
    return watchPaths.some((watchPath) => {
      return filename === watchPath || filename.startsWith(`${watchPath}/`)
    })
  })
}

async function retrieveBootstrapData(
  url: string,
  timeout: number,
  retryDelay: number,
  logger: Winston.Logger,
  debugBootstrapData?: Types.BootstrapData,
): Promise<Types.BootstrapData> {
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

  while (true) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      logger.info("Bootstrap data received", { ...data })

      return data
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`Query failed. Retrying in ${retryDelay}ms...`, {
          error: error.message,
        })
      } else {
        logger.error("An unknown error occurred")
      }
      await delay(retryDelay)
    }
  }
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

async function connectMqttClient(
  serviceId: string,
  tcpBrokerUri: string,
  device: string | undefined,
  logger: Winston.Logger,
  mqttOptions?: Types.MqttClientOptions,
): Promise<MqttClient> {
  const clientId = createClientId(serviceId, device)

  logger.info("Connecting to Broker", { tcpBrokerUri, clientId })
  const mqttClient = await MqttClient.connect(tcpBrokerUri, { clientId, ...mqttOptions })
  logger.info("Connected to Broker")

  mqttClient.underlyingClient.on("close", () => {
    logger.error("Disconnected from Broker")
  })
  mqttClient.underlyingClient.on("reconnect", () => {
    logger.info("Reconnecting to Broker")
  })
  mqttClient.underlyingClient.on("error", () => {
    logger.error("Error Connecting to Broker")
  })

  return mqttClient
}

function createClientId(serviceId: string, device?: string) {
  const uuid = Math.random().toString(16).substring(2, 10)
  if (device) {
    return `${serviceId}-${device}-${uuid}`
  } else {
    return `${serviceId}-${uuid}`
  }
}

function createQueryConfig(configServerUri: string): Types.QueryConfig {
  return async (configPath: string, params: Types.QueryParams = {}) => {
    const {
      version = "master",
      listFiles = false,
      includeCommitHash = false,
      parseJSON = true,
    } = params

    const url = `${configServerUri}/${encodeURIComponent(version)}/${configPath}?listFiles=${listFiles}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (includeCommitHash) {
      const commitHash = response.headers.get("git-commit-hash") || undefined
      const data = parseJSON ? await response.json() : await response.text()
      return { data, commitHash }
    } else {
      return parseJSON ? await response.json() : await response.text()
    }
  }
}
