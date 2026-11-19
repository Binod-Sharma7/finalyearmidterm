// ESP32 ON/OFF controller for Firebase Realtime Database
#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define WIFI_SSID "laxmi_fklkt_5"
#define WIFI_PASSWORD "9809500113@#"
#define FIREBASE_API_KEY "AIzaSyDBu-iAarwIEwoc2VrdYQZrJ91i6jv9eJA"
#define FIREBASE_DATABASE_URL "https://finalyearmidterm-default-rtdb.firebaseio.com"

constexpr uint8_t OUTPUT_PIN = 25;
constexpr unsigned long WIFI_RETRY_MS = 10000;
constexpr unsigned long FIREBASE_RECONNECT_MS = 5000;

FirebaseData streamData;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseStarted = false;
bool lastDeviceState = false;
bool deviceStateInitialized = false;
unsigned long lastWifiAttempt = 0;
unsigned long lastFirebaseReconnect = 0;

void printWifiStatus() {
    Serial.printf("WiFi: %s, IP: %s, RSSI: %d dBm\n",
                  WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected",
                  WiFi.localIP().toString().c_str(),
                  WiFi.RSSI());
}

void connectWifi() {
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    unsigned long now = millis();
    if (now - lastWifiAttempt < WIFI_RETRY_MS) {
        return;
    }
    lastWifiAttempt = now;

    Serial.println("Connecting to WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void setOutput(bool on) {
    if (deviceStateInitialized && on == lastDeviceState) {
        return;
    }

    digitalWrite(OUTPUT_PIN, on ? HIGH : LOW);
    lastDeviceState = on;
    deviceStateInitialized = true;
    Serial.printf("Device: %s (GPIO %u = %s)\n",
                  on ? "ON" : "OFF",
                  OUTPUT_PIN,
                  on ? "HIGH" : "LOW");
}

void streamCallback(FirebaseStream data) {
    if (data.dataTypeEnum() == fb_esp_rtdb_data_type_boolean) {
        bool state = data.boolData();
        setOutput(state);
        Serial.printf("Firebase: /device/state = %s\n", state ? "true" : "false");
    } else if (data.dataTypeEnum() == fb_esp_rtdb_data_type_null) {
        Serial.println("Firebase warning: /device/state is missing. Keeping GPIO LOW.");
        setOutput(false);
    } else {
        Serial.printf("Firebase warning: /device/state is not boolean (type: %s)\n",
                      data.dataType().c_str());
    }
}

void streamTimeoutCallback(bool timeout) {
    if (timeout) {
        Serial.println("Firebase stream timed out. The stream will reconnect.");
    }

    if (!streamData.httpConnected()) {
        Serial.printf("Firebase stream error: %s\n",
                      streamData.errorReason().c_str());
    }
}

void startFirebase() {
    if (firebaseStarted) {
        return;
    }

    config.api_key = FIREBASE_API_KEY;
    config.database_url = FIREBASE_DATABASE_URL;
    config.signer.test_mode = true;

    config.token_status_callback = tokenStatusCallback;
    Firebase.reconnectNetwork(true);
    Firebase.setDoubleDigits(5);

    Firebase.begin(&config, &auth);

    if (Firebase.ready()) {
        Serial.println("Firebase: Starting anonymous authentication.");
    }

    if (!Firebase.RTDB.beginStream(&streamData, "/device/state")) {
        Serial.printf("Firebase stream failed to start: %s\n",
                      streamData.errorReason().c_str());
        return;
    }

    Firebase.RTDB.setStreamCallback(&streamData,
                                    streamCallback,
                                    streamTimeoutCallback);
    firebaseStarted = true;
    Serial.println("Firebase: Connected to Realtime Database.");
}

void setup() {
    Serial.begin(115200);
    pinMode(OUTPUT_PIN, OUTPUT);
    digitalWrite(OUTPUT_PIN, LOW);
    lastDeviceState = false;
    deviceStateInitialized = true;

    Serial.println();
    Serial.println("ESP32 Firebase ON/OFF Controller");
    printWifiStatus();
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWifiAttempt = millis();
}

void loop() {
    connectWifi();

    if (WiFi.status() == WL_CONNECTED) {
        static bool wifiWasConnected = false;
        if (!wifiWasConnected) {
            wifiWasConnected = true;
            printWifiStatus();
        }

        if (!firebaseStarted) {
            startFirebase();
        }

        if (firebaseStarted && !Firebase.ready()) {
            unsigned long now = millis();
            if (now - lastFirebaseReconnect >= FIREBASE_RECONNECT_MS) {
                lastFirebaseReconnect = now;
                Serial.println("Firebase: Waiting for authentication...");
            }
        }

        if (firebaseStarted && !streamData.streamTimeout()) {
            Firebase.RTDB.readStream(&streamData);
        }

    } else {
        static bool wifiWasConnected = true;
        if (wifiWasConnected) {
            wifiWasConnected = false;
            Serial.println("WiFi disconnected. Reconnecting automatically.");
        }
    }

    delay(10);
}