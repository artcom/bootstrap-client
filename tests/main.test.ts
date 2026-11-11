import assert from "node:assert/strict"
import { afterEach, describe, it, mock } from "node:test"

import { MqttClient } from "@artcom/mqtt-topping"

import { init } from "../src/main.js"

const debugBootstrapData = {
  tcpBrokerUri: "tcp://broker:1883",
  httpBrokerUri: "http://broker:8080",
  configServerUri: "http://config",
  device: "dev",
}

function mockConnect() {
  const fakeClient = { underlyingClient: { on: () => {} } }
  return mock.method(MqttClient, "connect", async () => fakeClient)
}

function connectOptions(connect: ReturnType<typeof mockConnect>) {
  return connect.mock.calls[0].arguments[1] as Record<string, unknown>
}

afterEach(() => {
  mock.restoreAll()
})

describe("init", () => {
  it("connects with a generated clientId when no mqttOptions are given", async () => {
    const connect = mockConnect()

    await init("", "service", { debugBootstrapData })

    assert.equal(connect.mock.callCount(), 1)
    assert.equal(connect.mock.calls[0].arguments[0], "tcp://broker:1883")
    assert.match(String(connectOptions(connect).clientId), /^service-dev-[0-9a-f]+$/)
  })

  it("merges static mqttOptions with the clientId", async () => {
    const connect = mockConnect()

    await init("", "service", { debugBootstrapData, mqttOptions: { keepalive: 7 } })

    const options = connectOptions(connect)
    assert.equal(options.keepalive, 7)
    assert.match(String(options.clientId), /^service-dev-/)
  })

  it("lets static mqttOptions override the clientId", async () => {
    const connect = mockConnect()

    await init("", "service", { debugBootstrapData, mqttOptions: { clientId: "custom" } })

    assert.equal(connectOptions(connect).clientId, "custom")
  })

  describe("mqttOptions function", () => {
    it("receives logger, data, httpClient and queryConfig", async () => {
      mockConnect()
      const factory = mock.fn(() => ({}))

      const result = await init("", "service", { debugBootstrapData, mqttOptions: factory })

      assert.equal(factory.mock.callCount(), 1)
      const context = factory.mock.calls[0].arguments[0]
      assert.equal(context.logger, result.logger)
      assert.equal(context.data, result.data)
      assert.equal(context.httpClient, result.httpClient)
      assert.equal(context.queryConfig, result.queryConfig)
      assert.equal(typeof context.queryConfig, "function")
    })

    it("is called before connecting", async () => {
      const connect = mockConnect()
      const factory = mock.fn(() => {
        assert.equal(connect.mock.callCount(), 0)
        return {}
      })

      await init("", "service", { debugBootstrapData, mqttOptions: factory })

      assert.equal(factory.mock.callCount(), 1)
      assert.equal(connect.mock.callCount(), 1)
    })

    it("merges a sync result after the clientId", async () => {
      const connect = mockConnect()

      await init("", "service", {
        debugBootstrapData,
        mqttOptions: () => ({ keepalive: 7 }),
      })

      const options = connectOptions(connect)
      assert.equal(options.keepalive, 7)
      assert.match(String(options.clientId), /^service-dev-/)
    })

    it("merges an async result that overrides the clientId", async () => {
      const connect = mockConnect()

      await init("", "service", {
        debugBootstrapData,
        mqttOptions: async () => ({ clientId: "custom", keepalive: 7 }),
      })

      const options = connectOptions(connect)
      assert.equal(options.clientId, "custom")
      assert.equal(options.keepalive, 7)
    })

    it("provides an undefined queryConfig without configServerUri", async () => {
      mockConnect()
      const factory = mock.fn(() => ({}))

      await init("", "service", {
        debugBootstrapData: { tcpBrokerUri: "tcp://broker:1883" },
        mqttOptions: factory,
      })

      assert.equal(factory.mock.calls[0].arguments[0].queryConfig, undefined)
    })

    it("rejects init and does not connect when the function rejects", async () => {
      const connect = mockConnect()

      await assert.rejects(
        init("", "service", {
          debugBootstrapData,
          mqttOptions: async () => {
            throw new Error("no will")
          },
        }),
        /no will/,
      )

      assert.equal(connect.mock.callCount(), 0)
    })
  })
})
