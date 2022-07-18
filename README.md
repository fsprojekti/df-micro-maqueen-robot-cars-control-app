# Robot Car Control Application

This Node.js application controls the fleet of DF micro:Maqueen Plus EN v1 robot cars that work in a shared manufacturing setting. The application receives requests from parcels and selects a robot car that performs the transfer of the parcel from location A to location B on the pre-defined grid.

## DFRobot micro:Maqueen Plus EN V1 Robot Car
An Advanced STEM Education Robot with six line-tracking sensors, IR receiver, ultrasonic sensor, RGB ambient lights, LED car lights, buzzer etc.
For more info see: https://www.dfrobot.com/product-2026.html

## Arduino Application for DFRobot micro:Maqueen 
See: https://github.com/fsprojekti/df_micro_maqueen-mbits-esp32_arduino_app

## Grids for robot car movements

2022 Summer School on Industrial Internet of Things and Blockchain Technology

**TODO**


## HTTP API
|endpoint|parameters|description|
|----|----|-----------|
|/cars|array of JSON object car|array of all active cars|
|/requestsQueue|array of JSON object request|array of all active transfers requests|
|/request|{"packageId": id, "source": a, "target": b}|sent by a parcel|
|/report|{"state:" accept/reject, "taskId": a}}|sent by a car when it reaches the location|
|/getTask|{"taskId": id}|return the current state of the task|

## Variables

|name|type|description|value|
|----|----|-----------|-----|
|requestsQueue|array(request)|array of all active transfer requests|/|
|request|JSON object of request|data needed to fulfill the request|/|
|request.taskId|int|unique task id|starts from 0|
|request.packageId|int|id of the package that sent the request|defined by the package|
|request.packageUrl|int|url (ip+port) of the package that sent the request|read from the request|
|request.sourceLocation|int||from 1 to 7|
|request.targetLocation|int||from 1 to 7|
|request.state|string|state of the request: queue, transferToSourceLocation, ...||
|cars|array(car)|array of robot cars in operation||
|car|JSON object of car||
|car.id|string|unique car id|starts from 0|
|car.url|string|car IP address on the local WiFi network|defined in the config.json file|
|car.startLocation|number|car location when the experiment starts|1 to 4: production areas, 5, 6, 8 and 9: parking areas, 7: warehouse|
|car.location|number|current car location|1 to 4: production areas, 5, 6, 8 and 9: parking areas, 7: warehouse|
|car.available|boolean|availability to carry out a transfer|true / false |
