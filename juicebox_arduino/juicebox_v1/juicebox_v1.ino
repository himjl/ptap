
#include <WebUSB.h>

WebUSB WebUSBSerial(1, "s3.amazonaws.com/ptapupstairs/public/landing_pages/inlab/Crypto_landing_page.html");

#define WebSerial WebUSBSerial

// Example 3 - Receive with start- and end-markers

const byte numChars = 32;
char receivedChars[numChars];
boolean newData = false;
const int pumpPIN=2;
const int statusPIN=4;
const int pumpLEDPIN=7;
int pumpdur;

void setup() {
  pinMode(pumpPIN, OUTPUT);
  pinMode(statusPIN, OUTPUT);
  pinMode(pumpLEDPIN, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  WebSerial.begin(9600);


  while (!WebSerial) { // wait for serial port to connect. Needed for native USB
    digitalWrite(statusPIN, HIGH);
    delay(300);
    digitalWrite(statusPIN, LOW);
    delay(300);
  }
  
  WebSerial.println("<Arduino is ready> Sketch begins \r\n>");
  WebSerial.flush();
}

void loop() {
    recvWithStartEndMarkers();
    showNewData();
    turnOnPump();
    
    
}

void recvWithStartEndMarkers() {
    static boolean recvInProgress = false;
    static byte ndx = 0;
    char startMarker = '{';
    char endMarker = '}';
    char rc;
 
    while (WebSerial && WebSerial.available() > 0 && newData == false) {
        rc = WebSerial.read();
        
        if (recvInProgress == true) {
          
            if (rc != endMarker) {
                receivedChars[ndx] = rc;
                ndx++;
                if (ndx >= numChars) {
                    ndx = numChars - 1;
                }
            }
            else {
                receivedChars[ndx] = '\0'; // terminate the string
                recvInProgress = false;
                ndx = 0;
                newData = true;
            }
        }

        else if (rc == startMarker) {
            recvInProgress = true;
        }
    }
}

void showNewData() {
    if (newData == true) {
        WebSerial.print("This just in ... ");
        WebSerial.println(receivedChars);
        WebSerial.flush();
        
    }
}

void turnOnPump() {
  if (newData == true) {
    pumpdur = atoi(receivedChars);
    delay(150);
    digitalWrite(pumpPIN,HIGH);
    digitalWrite(pumpLEDPIN,HIGH);
    delay(pumpdur);
    digitalWrite(pumpPIN,LOW);
    digitalWrite(pumpLEDPIN,LOW);
    newData = false;
    
    WebSerial.print("Pump triggered, dur=");
    WebSerial.print(pumpdur);
    WebSerial.flush();
  }
}
