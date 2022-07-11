# Robot Car Control Application

This Node.js application controls the fleet of DFMaqueen Plus EN v1 robot cars that work in a shared manufacturing setting. The application receives requests from parcels and selects a robot car that performs the transfer of the parcel from location A to location B on the pre-defined grid.

## DFRobot micro:Maqueen Plus EN V1 Robot Car
An Advanced STEM Education Robot with six line-tracking sensors, IR receiver, ultrasonic sensor, RGB ambient lights, LED car lights, buzzer etc.
For more info see: https://www.dfrobot.com/product-2026.html

## Arduino Application for DFRobot micro:Maqueen 
See: https://github.com/fsprojekti/df_micro_maqueen-mbits-esp32_arduino_app

## HTTP API
|endpoint|parameters|description|
|----|----|-----------|
|/requestTransfer|JSON object {"startLocation": a, "endLocation": b}|sent by a parcel|


## Variables

|name|type|description|value|
|----|----|-----------|-----|
|requestsQueue|array(request)|array of all active transfer requests|
|request|JSON object {"startLocation": a, "endLocation": b}|data needed to fulfill the request|
|cars|array(car)|array of robot cars in operation|
|car|JSON object of car|
|car.id|string|unique car id|
|car.url|string|car IP address on the local WiFi network|defined in the config.json file|
|car.startLocation|number|car location when the experiment starts|1 to 4: production areas, 5, 6, 8 and 9: parking areas, 7: warehouse|
|car.location|number|current car location|1 to 4: production areas, 5, 6, 8 and 9: parking areas, 7: warehouse|
|car.available|boolean|availability to carry out a transfer|true / false |