import mqtt from "mqtt";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
let lastTimeMessageReceived = Date.now();

const mqttClient = mqtt.connect(`mqtts://${process.env.ENDPOINT}:8883`, {
  key: process.env.KEY,
  cert: process.env.CERT,
  ca: process.env.CA,
  clientId: process.env.CLIENT_ID,
  protocolId: "MQTT",
  protocolVersion: 5,
});

mqttClient.on("connect", function () {
  console.log("Connected to MQTT broker");
  mqttClient.subscribe("esp32/pub");
});

mqttClient.on("message", function (topic, message) {
  const currentTime = Date.now();
  const timeDiff = (currentTime - lastTimeMessageReceived) / 1000;
  if (timeDiff > process.env.TRANSFER_INTERVAL_SECONDS) {
    const data = JSON.parse(message.toString());
    if (
      data.temperature === undefined ||
      data.humidity === undefined ||
      data.waterLevel === undefined
    )
      return;
    axios.post(`${process.env.SERVER_URL}/temperatures`, {
      value: parseInt(data.temperature),
    });
    axios.post(`${process.env.SERVER_URL}/humidities`, {
      value: parseInt(data.humidity),
    });
    axios.post(`${process.env.SERVER_URL}/water-levels`, {
      value: parseInt(data.waterLevel),
    });
    console.log("Data sent to API", {
      temperature: data.temperature,
      humidity: data.humidity,
      waterLevel: data.waterLevel,
    });
    lastTimeMessageReceived = currentTime;
  }
});

mqttClient.on("error", function (error) {
  console.error("Error:", error);
});
