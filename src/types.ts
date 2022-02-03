import { Winston } from "@artcom/logger"
import { HttpClient, MqttClient, ErrorCallback, unpublishRecursively } from "@artcom/mqtt-topping"

export type BootstrapData = {
  configServerUri?: string
  device?: string
  httpBrokerUri?: string
  tcpBrokerUri?: string
}

export type QueryParams = {
  version?: string
  listFiles?: boolean
  includeCommitHash?: boolean
  parseJSON?: boolean
}

export type QueryConfig = (configPath: string, params: QueryParams) => any

export type InitData = {
  logger: Winston.Logger
  mqttClient: MqttClient
  httpClient: HttpClient
  queryConfig: QueryConfig
  data: BootstrapData
  unpublishRecursively: typeof unpublishRecursively
}

export type Options = {
  timeout?: number
  retryDelay?: number
  onParseError?: ErrorCallback
  debugBootstrapData?: BootstrapData
}
