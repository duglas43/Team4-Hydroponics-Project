#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include "DHT.h"

#include <Arduino.h>

#define DHTPIN 14  
#define DHTTYPE DHT11  
#define WATER_SENSOR_PIN 32
#define AWS_IOT_PUBLISH_TOPIC "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"
float h;
float t;
float waterLevelSensorValue;

// Pins
const int WATER_LEVEL_SENSOR_PIN = 32;
const int WATER_MOTOR_RELAY_PIN = 2;
const int NUTRIENT_MOTOR_RELAY_PIN = 0;

// Constants
const int SYSTEM_DELAY = 100;                      // 1 second
const float NUTRIENT_MOTOR_FLOW_RATE = 1.0 / 1000; // 0.001 cc/ms
const float WATER_MOTOR_FLOW_RATE = 1.0 / 1000;    // 0.001 cc/ms
const float WATER_LEVEL_MIN = 600;                // 0.5 cm
const float WATER_LEVEL_MAX = 900;                // 2.0 cm
const int WATER_LEVEL_SENSOR_READ_INTERVAL = 1000; // 1 second

// System variables
int previousWaterMillis = 0;
int previousNutrientMillis = 0;
int lastTimeNutrientMotorStarted = 0;

bool isWaterMotorRunning = false;
bool isNutrientMotorRunning = false;

DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

struct Plant
{
public:
    unsigned int id;
    String name;
    String description;
    float nutrientVolume;          // in cc
    int nutrientAdditionFrequency; // in seconds (in future, it will be in hours)
    boolean isSelected;
    Plant(unsigned int id, String name, String description, float nutrientVolume, int nutrientAdditionFrequency, boolean isSelected)
        : id(id), name(name), description(description), nutrientVolume(nutrientVolume), nutrientAdditionFrequency(nutrientAdditionFrequency), isSelected(isSelected)
    {
    }
};

void connectAWS() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.setServer(AWS_IOT_ENDPOINT, 8883);

  // Create a message handler
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IOT");

  while (!client.connect(THINGNAME)) {
    Serial.print(".");
    delay(100);
  }

  if (!client.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);

  Serial.println("AWS IoT Connected!");
}

void publishMessage() {
  StaticJsonDocument<400> doc;
  doc["Humidity"] = h;
  doc["Temperature"] = t;
  doc["Water Level"] = waterLevelSensorValue;
  char jsonBuffer[4096];
  serializeJson(doc, jsonBuffer);  

  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("incoming: ");
  Serial.println(topic);

  StaticJsonDocument<400> doc;
  deserializeJson(doc, payload);
  const char* message = doc["message"];
  Serial.println(message);
}

void setup() {
  Serial.begin(115200);
  connectAWS();
  dht.begin();
  pinMode(WATER_SENSOR_PIN, INPUT);
  
  pinMode(WATER_LEVEL_SENSOR_PIN, INPUT);
  pinMode(NUTRIENT_MOTOR_RELAY_PIN, OUTPUT);
  pinMode(WATER_MOTOR_RELAY_PIN, OUTPUT);

}

void loop() {
  waterLevelSensorValue = analogRead(WATER_SENSOR_PIN); 
  h = dht.readHumidity();
  t = dht.readTemperature();

  if (isnan(h) || isnan(t)) 
  {
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  Serial.print(F("Humidity: "));
  Serial.print(h);
  Serial.print(F("%  Temperature: "));
  Serial.print(t);
  Serial.print(F("°C "));
  Serial.print(F("Water Level: "));
  Serial.print(waterLevelSensorValue);
  Serial.println("");

  publishMessage();
  client.loop();
  //delay(2000);

  unsigned long currentMillis = millis();
  int waterLevel = analogRead(WATER_LEVEL_SENSOR_PIN);
  //Serial.println(waterLevel);
  Plant selectedPlant = getSelectedPlant();

  // HERE WE CAN ADD ANOTHER FUNCTIONS. FOR EXAMPLE SEND DATA TO THE SERVER OR OTHER ACTIONS

  if (isTimeToCheckWaterLevel(currentMillis, previousWaterMillis, WATER_LEVEL_SENSOR_READ_INTERVAL))
  {
      if (isWaterNeeded(waterLevel) && !isWaterMotorRunning)
      {
        Serial.println("do so");
          waterPlants();
          isWaterMotorRunning = true;
      }
      if (isWaterLevelExcessive(waterLevel) && isWaterMotorRunning)
      {
        Serial.println("stop");
          stopWateringPlants();
          isWaterMotorRunning = false;
      }
      previousWaterMillis = currentMillis;
  }

  if (isTimeToCheckNutrientLevel(currentMillis, previousNutrientMillis, selectedPlant.nutrientAdditionFrequency * 1000))
  {
      if (!isNutrientMotorRunning)
      {
          nutrientPlants();
          lastTimeNutrientMotorStarted = currentMillis;
          isNutrientMotorRunning = true;
      }
      if (isNutrientMotorRunning && currentMillis - lastTimeNutrientMotorStarted > selectedPlant.nutrientVolume / NUTRIENT_MOTOR_FLOW_RATE)
      {
          stopNutrientPlants();
          previousNutrientMillis = currentMillis;
          isNutrientMotorRunning = false;
      }
  }

  delay(SYSTEM_DELAY);
}

Plant getSelectedPlant()
{
    // HERE WE WILL GET THE SELECTED PLANT FROM THE DATABASE
    Plant mockPlant(1, "Rose", "Beautiful flowering plant", 7.0, 7, true);
    return mockPlant;
}
bool isTimeToCheckWaterLevel(unsigned long currentMillis, unsigned long previousMillis, unsigned long interval)
{
    return currentMillis - previousMillis >= interval;
}

bool isTimeToCheckNutrientLevel(unsigned long currentMillis, unsigned long previousMillis, unsigned long interval)
{
    return currentMillis - previousMillis >= interval;
}
bool isWaterNeeded(int waterLevel)
{
    return waterLevel <= WATER_LEVEL_MIN;
}

bool isWaterLevelExcessive(int waterLevel)
{
    return waterLevel >= WATER_LEVEL_MAX;
}

void waterPlants()
{
    digitalWrite(WATER_MOTOR_RELAY_PIN, HIGH);
}
void stopWateringPlants()
{
    digitalWrite(WATER_MOTOR_RELAY_PIN, LOW);
}
void nutrientPlants()
{
    digitalWrite(NUTRIENT_MOTOR_RELAY_PIN, HIGH);
}
void stopNutrientPlants()
{
    digitalWrite(NUTRIENT_MOTOR_RELAY_PIN, LOW);
}
