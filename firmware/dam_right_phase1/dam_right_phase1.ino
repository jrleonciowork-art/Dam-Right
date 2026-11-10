// Dam Right - Phase 1 isolated water-level prototype
// Board: ESP32
// Sensor: JSN-SR04T (TRIG -> GPIO 5, ECHO -> GPIO 18)
//
// IMPORTANT: The JSN-SR04T ECHO pin may output 5 V. Protect the ESP32's
// 3.3 V GPIO with a suitable voltage divider or logic-level converter.

#include <Arduino.h>

constexpr uint8_t TRIGGER_PIN = 5;
constexpr uint8_t ECHO_PIN = 18;

constexpr unsigned long SAMPLE_INTERVAL_MS = 5000;
constexpr unsigned long ECHO_TIMEOUT_US = 30000;
constexpr float SPEED_OF_SOUND_CM_PER_US = 0.0343F;

// Vertical distance from the sensor face to the zero-water reference.
// Measure this value at the installation site before field use.
constexpr float SENSOR_TO_BASE_HEIGHT_M = 3.0F;

// Replace with the permanent structure UUID when backend integration begins.
constexpr char STRUCTURE_ID[] = "00000000-0000-4000-8000-000000000001";

unsigned long lastSampleAt = 0;

float measureDistanceMeters() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  const unsigned long echoDurationUs = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);

  if (echoDurationUs == 0) {
    return NAN;
  }

  // Sound travels to the water surface and back, hence division by two.
  const float distanceCm =
    (echoDurationUs * SPEED_OF_SOUND_CM_PER_US) / 2.0F;

  return distanceCm / 100.0F;
}

float calculateWaterLevelMeters(const float distanceMeters) {
  const float waterLevel = SENSOR_TO_BASE_HEIGHT_M - distanceMeters;
  return constrain(waterLevel, 0.0F, SENSOR_TO_BASE_HEIGHT_M);
}

void printTelemetryJson(const float wetSideLevel) {
  // The dry-side value remains zero until a second sensor is installed.
  Serial.printf(
    "{\"structure_id\":\"%s\",\"wet_side_level\":%.3f,\"dry_side_level\":0.000}\n",
    STRUCTURE_ID,
    wetSideLevel
  );
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIGGER_PIN, LOW);

  delay(500);
  Serial.println("Dam Right Phase 1 sensor ready.");
}

void loop() {
  const unsigned long now = millis();

  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) {
    return;
  }

  lastSampleAt = now;
  const float distanceMeters = measureDistanceMeters();

  if (isnan(distanceMeters)) {
    Serial.println("{\"error\":\"sensor_timeout\"}");
    return;
  }

  printTelemetryJson(calculateWaterLevelMeters(distanceMeters));
}
