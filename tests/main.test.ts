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
})
