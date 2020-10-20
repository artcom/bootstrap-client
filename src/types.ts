import { ClientWrapper } from "mqtt-topping"
import { Winston } from "@artcom/logger"

export type BootstrapData = {
    configServerUri: string,
    device: string,
    httpBrokerUri: string,
    tcpBrokerUri: string,
    wsBrokerUri: string
  }

export type QueryConfig = (configPath: string) => any

export type InitData = {
    logger: Winston.Logger,
    mqttClient: ClientWrapper,
    queryConfig: QueryConfig,
    data: BootstrapData
  }

export type Options = {
    timeout?: number,
    retryDelay?: number,
    debugBootstrapData?: BootstrapData
  }
