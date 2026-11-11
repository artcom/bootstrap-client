import assert from "node:assert/strict"
import { afterEach, it, mock } from "node:test"

import { MqttClient } from "@artcom/mqtt-topping"

import { init } from "../src/main.js"

afterEach(() => {
  mock.restoreAll()
})

it("supports the README last will example with queryConfig", async () => {
  const connect = mock.method(MqttClient, "connect", async () => ({
    underlyingClient: { on: () => {} },
  }))
  mock.method(globalThis, "fetch", async () => Response.json({ willTopic: "devices/dev/status" }))

  await init<{ configServerUri: string }>("", "service", {
    debugBootstrapData: { tcpBrokerUri: "tcp://broker:1883", configServerUri: "http://config" },
    mqttOptions: async ({ queryConfig }) => {
      const { willTopic } = await queryConfig<{ willTopic: string }>("device/config.json")

      return {
        will: { topic: willTopic, payload: "offline", qos: 1, retain: true, stringifyJson: false },
      }
    },
  })

  const options = connect.mock.calls[0].arguments[1] as { will: { topic: string } }
  assert.equal(options.will.topic, "devices/dev/status")
})

it("types queryConfig as optional unless configServerUri is declared", () => {
  const withoutConfigServer = () =>
    init("", "service", {
      mqttOptions: ({ queryConfig }) => {
        // @ts-expect-error queryConfig is possibly undefined by default
        void queryConfig("x")
        return {}
      },
    })
  assert.equal(typeof withoutConfigServer, "function")
})
