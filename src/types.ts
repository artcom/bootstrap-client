import { Winston } from "@artcom/logger"
import { HttpClient, MqttClient } from "@artcom/mqtt-topping"

/**
 * Data needed to bootstrap the application, typically retrieved from the bootstrap server.
 */
export type BootstrapData = {
  /** URI of the configuration server */
  readonly configServerUri?: string
  /** Name or ID of the device */
  readonly device?: string
  /** URI of the HTTP broker */
  readonly httpBrokerUri?: string
  /** URI of the TCP broker */
  readonly tcpBrokerUri?: string
}

export type ConfigurationChangePayload = {
  readonly changedFiles?: string[]
  readonly refName?: string
}

export type QueryParams = {
  /** The version of the configuration to fetch (default: "master") */
  readonly version?: string
  /** Whether to list files in the directory (default: false) */
  readonly listFiles?: boolean
  /** Whether to include the commit hash in the response (default: false) */
  readonly includeCommitHash?: boolean
  /** Whether to parse the response as JSON (default: true) */
  readonly parseJSON?: boolean
}

/**
 * Function to query configuration data from the config server.
 */
export interface QueryConfig {
  /**
   * Queries configuration as a raw string when parseJSON is explicitly false.
   */
  (configPath: string, params: QueryParams & { readonly parseJSON: false }): Promise<string>

  /**
   * Queries configuration and parses it as JSON (default behavior).
   */
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
  /** Requests timeout in milliseconds (default: 2000) */
  readonly timeout?: number
  /** Delay between retries in milliseconds (default: 10000) */
  readonly retryDelay?: number
  /** Hardcoded bootstrap data for debugging purposes */
  readonly debugBootstrapData?: BootstrapData
}
