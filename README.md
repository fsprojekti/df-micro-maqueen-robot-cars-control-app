# Robot Car Control Application

This Node.js application controls the fleet of DF micro:Maqueen Plus EN v1 robot cars that work in a shared manufacturing setting. The application receives requests from parcels and selects a robot car that performs the transfer of the parcel from location A to location B on the pre-defined grid.

## DFRobot micro:Maqueen Plus EN V1 Robot Car
An Advanced STEM Education Robot with six line-tracking sensors, IR receiver, ultrasonic sensor, RGB ambient lights, LED car lights, buzzer etc.
For more info see: https://www.dfrobot.com/product-2026.html

## Arduino Application for DFRobot micro:Maqueen 
See: https://github.com/fsprojekti/df_micro_maqueen-mbits-esp32_arduino_app

## Grids for robot car movements

2022 Summer School on Industrial Internet of Things and Blockchain Technology

![grid-proga](https://user-images.githubusercontent.com/87708323/179540758-1d4ca449-1616-4dc1-a5a3-cfe982ef599f.png)

## HTTP API
|endpoint|description|parameters|returns|
|----|----|-----------|------|
|<code>/cars</code>|get data on active robot cars|/|array of JSON objects "car"|
|<code>/parkingAreas</code>|get data on active parking areas|/|array of JSON objects "parkingArea"|
|<code>/requestsQueue</code>|get data on active transfers requests|/|array of JSON objects "request"|
|<code>/request</code>|sent by a parcel to request a transport|<code>{"packageId": id, "source": a, "target": b}</code>|{status (accept, reject), queueIndex, taskId}\
|<code>/report</code>|sent by a car when it reaches a location|<code>{"state:" accept/reject, "taskId": </code>|{state: success/error}
|<code>/getTask</code>|get current state of the task|<code>{"taskId": id}</code>|one of 9 states in string format|

## Variables

|name|type|description|value|
|----|----|-----------|-----|
|requestsQueue|array(request)|array of all active transfer requests||
|request|JSON object|data needed to fulfill the request||
|request.taskId|int|unique task id|defined by carriers management, starts from 0|
|request.packageId|int|id of the package that sent the request|defined by the package|
|request.packageUrl|int|url (ip+port) of the package that sent the request|read from the request|
|request.sourceLocation|int|id of the source location based on the predefined grid|from 1 to 7|
|request.targetLocation|int|id of the target location based on the predefined grid|from 1 to 7|
|request.state|string|state of the request|queue<br>transportToSourceLocation<br>sourceLocation<br>sourceDispatchPending<br>sourceDispatchFinished<br>transportToTargetLocation<br>targetLocation<br>targetDispatchPending<br>targetDispatchFinished<br>transportToParking<br>transportFinishedPending|
|cars|array(car)|array of robot cars in operation||
|car|JSON object||
|car.id|string|unique car id|starts from 0|
|car.url|string|car IP address on local WiFi network|defined in config.json file|
|car.startLocation|number|car location when the experiment starts|1 to 4: production areas, 5: warehouse (master plant), 6, to 9: parking areas|
|car.location|number|current car location|1 to 4: production areas, 5: warehouse (master plant), 6, to 9: parking areas|
|car.available|boolean|availability to carry out a transfer|true / false |
|parkingAreas|array(parkingArea)|array of parking areas in operation||
|parkingArea|JSON object||
|parkingArea.id|string|unique parkingArea id|defined by carriers management, starts from 0|
|parkingArea.location|int|parkingArea location|6 to 9|
|parkingArea.available|boolean|availability to accept a car for parking|true / false |
