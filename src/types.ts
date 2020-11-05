import { Winston } from "@artcom/logger"
import { HttpClient, MqttClient } from "@artcom/mqtt-topping"

export type BootstrapData = {
    configServerUri: string,
    device: string,
    httpBrokerUri: string,
    tcpBrokerUri: string
  }

export type QueryParams = {
    version?: string,
    listFiles?: boolean,
    includeCommitHash?: boolean
  }

export type QueryConfig = (configPath: string, params: QueryParams) => any

export type InitData = {
    logger: Winston.Logger,
    mqttClient: MqttClient,
    httpClient: HttpClient,
    queryConfig: QueryConfig,
    data: BootstrapData
  }

export type Options = {
    timeout?: number,
    retryDelay?: number,
    debugBootstrapData?: BootstrapData
  }
