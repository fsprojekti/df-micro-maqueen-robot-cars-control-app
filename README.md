# Robot Car Control Application

This Node.js application controls the fleet of DF micro:Maqueen Plus EN v2 robot cars that work in a shared
manufacturing setting. The application receives requests from packages and selects a robot car that performs the
transfer of the package from location A to location B on the pre-defined grid.

## DFRobot micro:Maqueen Plus EN V1 Robot Car

An Advanced STEM Education Robot with five line-tracking sensors, IR receiver, ultrasonic sensor, RGB ambient lights, LED
car lights, buzzer etc.
For more info see: https://www.dfrobot.com/product-2026.html

## Arduino Application for DFRobot micro:Maqueen

See: https://github.com/fsprojekti/df_micro_maqueen-mbits-esp32_arduino_app

## Grid for robot car movements

Grid user for 2023 Summer School on Industrial Internet of Things and Blockchain Technology

![grid-proga](https://user-images.githubusercontent.com/87708323/180164381-9a6275c4-19dd-467b-b9e0-7b063ee7a87f.png)

## HTTP API

| endpoint                       | description                                            | parameters                                               | returns                                      |
|--------------------------------|--------------------------------------------------------|----------------------------------------------------------|----------------------------------------------|
| <code>/cars</code>             | retrieve information on currently active robot cars    | /                                                        | array of JSON objects "car"                  |
| <code>/parkingAreas</code>     | retrieve information on currently active parking areas | /                                                        | array of JSON objects "parkingArea"          |
| <code>/requestsQueue</code>    | retrieve information on ongoing transfer requests      | /                                                        | array of JSON objects "request"              |
| <code>/getOffer</code>         | obtain the latest status of the offer                  | <code>{"offerId": id}</code>                             | one of 12 states in string format            |
| <code>/request</code>          | sent by a package to request transportation            | <code>{"packageId": id, "source": a, "target": b}</code> | <code>{{state: accept/reject, queueIndex, offerId}</code>|
| <code>/report</code>           | sent by a car upon reaching a destination              | <code>{"state:" accept/reject, "taskId": id </code>      | <code>{{state: success/error}</code>                       |
| <code>/dispatchFinished</code> | sent by a plant once the dispatch process is completed | <code>{"offerId": id}</code>                             | <code>{state: success/error}</code>          |

## Variables

| name                   | type               | description                                            | value                                                                                                                                                                                                                                                               |
|------------------------|--------------------|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| requestsQueue          | array(request)     | array of all ongoing transfer requests                 |                                                                                                                                                                                                                                                                     |
| request                | JSON object        | data needed to fulfill the request                     |                                                                                                                                                                                                                                                                     |
| request.offerId        | int                | unique offer id                                        | defined by the package, received in /request request                                                                                                                                                                                                                |
| request.packageId      | int                | id of the package that sent the request                | defined by the package                                                                                                                                                                                                                                              |
| request.packageUrl     | int                | url (ip+port) of the package that sent the request     | read from the request                                                                                                                                                                                                                                               |
| request.sourceLocation | int                | id of the source location based on the predefined grid | from 1 to 9                                                                                                                                                                                                                                                         |
| request.targetLocation | int                | id of the target location based on the predefined grid | from 1 to 9                                                                                                                                                                                                                                                         |
| request.state          | string             | state of the request                                   | queue<br>transportToSourceLocation<br>sourceLocation<br>sourceDispatchPending<br>sourceDispatchFinished<br>transportToTargetLocation<br>targetLocation<br>targetDispatchPending<br>targetDispatchFinished<br>transferToParking<br>parking<br>packageResponsePending |
| request.carSelected    | JSON object        | robot car selected for the transfer                    |                                                                                                                                                                                                                                                                     |
| cars                   | array(car)         | array of robot cars in operation                       |                                                                                                                                                                                                                                                                     |
| car                    | JSON object        |                                                        |
| car.id                 | string             | unique car id                                          | starts from 0                                                                                                                                                                                                                                                       |
| car.url                | string             | car url address on local WiFi network                  | defined in config.json file                                                                                                                                                                                                                                         |
| car.startLocation      | number             | car location when the experiment starts                | 1 to 4: production areas, 5: warehouse (master plant), 6, to 9: parking areas                                                                                                                                                                                       |
| car.location           | number             | current car location                                   | 1 to 4: production areas, 5: warehouse (master plant), 6, to 9: parking areas                                                                                                                                                                                       |
| car.available          | boolean            | availability to carry out a transfer                   | true / false                                                                                                                                                                                                                                                        |
| parkingAreas           | array(parkingArea) | array of parking areas in operation                    |                                                                                                                                                                                                                                                                     |
| parkingArea            | JSON object        |                                                        |
| parkingArea.id         | string             | unique parkingArea id                                  | defined by carriers management, starts from 0                                                                                                                                                                                                                       |
| parkingArea.location   | int                | parkingArea location                                   | 6 to 9                                                                                                                                                                                                                                                              |
| parkingArea.available  | boolean            | availability to accept a car for parking               | true / false                                                                                                                                                                                                                                                        |

## State of the application post 2022 Summer School on IIoT and blockchain
* adjusted URLs for robot cars and manufacturing units 
* package requests now carry **offerId**, replacing the previous taskId for communication with robot cars and manufacturing units
* HTTP API endpoints status:
  * <code>/</code>, <code>/requestsQueue</code>, <code>/cars</code>, <code>/parkingAreas</code>, <code>/getTask</code>: tested, working OK
  * <code>/request</code>: tested, fully functional  
  * <code>/report</code>: tested and while functional, still receives taskId from robot cars.; this is internally converted to offerId
  * <code>/dispatchFinished</code>: tested, fully functional
* requestQueue processing: tested, working ok
  * responses from manufacturing units to the <code>/dispatch</code> request now return a **status** field, rather than the previously used state
* all other features are operating in accordance with the design 