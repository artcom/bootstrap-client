import type { Winston } from "@artcom/logger"
import { HttpClient, MqttClient } from "@artcom/mqtt-topping"
import type { MqttClientOptions } from "@artcom/mqtt-topping"

export { HttpClient, MqttClient }
export type { MqttClientOptions }

export type BootstrapData = {
  readonly configServerUri?: string
  readonly device?: string
  readonly httpBrokerUri?: string
  readonly tcpBrokerUri?: string
}

export type ConfigurationChangePayload = {
  readonly changedFiles?: string[]
  readonly refName?: string
}

export type QueryParams = {
  readonly version?: string
  readonly listFiles?: boolean
  readonly includeCommitHash?: boolean
  readonly parseJSON?: boolean
}

export interface QueryConfig {
  (configPath: string, params: QueryParams & { readonly parseJSON: false }): Promise<string>

  <T = unknown>(configPath: string, params?: QueryParams): Promise<T>
}

export type InitData<T extends BootstrapData = BootstrapData> = {
  readonly logger: Winston.Logger
  readonly mqttClient: MqttClient
  readonly httpClient: T extends { httpBrokerUri: string } ? HttpClient : HttpClient | undefined
  readonly queryConfig: T extends { configServerUri: string }
    ? QueryConfig
    : QueryConfig | undefined
  readonly data: T
}

export type Options = {
  readonly timeout?: number
  readonly retryDelay?: number
  readonly debugBootstrapData?: BootstrapData
  readonly mqttOptions?: MqttClientOptions
}
