const express = require('express');
const app = express();
const axios = require('axios').default;

// add timestamps in front of all log messages
require('console-stamp')(console, '[HH:MM:ss.l]');

// open file with configuration data
//const fs = require('fs');
const config = require("./config.json");

// global variables
let cars = [];
let requestsQueue = [];
let parkingAreas = [];
let parkingAreasTransfersQueue = [];
let taskIdCounter = 0;

// #### API ENDPOINTS ####

// default API endpoint, returns a message that the server is up and running
app.get('/', function (req, res) {

    console.log("Received a request to the endpoint /");
    res.send("Robot Cars Control Node.js server is up and running.");

});

// API endpoint that returns current value of the requests queue
app.get('/requestsQueue', function (req, res) {

    console.log("received a request to the endpoint /requestsQueue");
    res.send(JSON.stringify(requestsQueue));

});

// API endpoint that returns current value of the cars data
app.get('/cars', function (req, res) {

    console.log("received a request to the endpoint /cars");
    res.send(JSON.stringify(cars));

});

// API endpoint that returns current value of the cars data
app.get('/parkingAreas', function (req, res) {

    console.log("received a request to the endpoint /parkingAreas");
    res.send(JSON.stringify(parkingAreas));

});

// API endpoint called by a package to request a transfer
app.get('/request', function (req, res) {

    console.log("received a request to the endpoint /requestTransfer");

    let packageUrl = req.ip.substring(7, req.ip.length);

    console.log("received a request to the endpoint /requestTransfer from URL: " + packageUrl);

    if (!req.query.source || !req.query.target) {
        console.log("Error, missing source and/or target location and/or packageId");
        res.send({"status": "reject, missing source and/or target location and/or packageId"});
    } else {
        // extract data from the request = source and target locations for the requested transfer
        let sourceLocation = JSON.parse(req.query.source);
        let targetLocation = JSON.parse(req.query.target);
        let packageId = JSON.parse(req.query.packageId);

        // create a request object and add it to the queue
        let reqObject = {}
        reqObject.taskId = taskIdCounter;
        taskIdCounter++;
        reqObject.packageId = packageId;
        reqObject.packageUrl = packageUrl;
        reqObject.sourceLocation = sourceLocation;
        reqObject.targetLocation = targetLocation;
        reqObject.state = "queue"; // "queue": waiting in the queue; "done": a car has reached the target location

        let queueIndex = requestsQueue.push(reqObject);

        console.log("Current requests queue:" + JSON.stringify(requestsQueue));

        res.send({"status": "accept", "queueIndex": queueIndex, "taskId": reqObject.taskId});
    }
});

// API endpoint called by a package to request a transfer
app.get('/getTask', function (req, res) {

    console.log("received a request to the endpoint /getTask");

    if (!req.query.taskId) {
        console.log("Error, missing taskId");
        res.send({"status": "reject, missing taskId"});
    } else {
        // extract data from the request = task id
        let taskId = JSON.parse(req.taskId.source);

        // find the car in the cars array
        let requestArr = requestsQueue.filter(function (request) {
            return request.taskId === taskId;
        });

        // filter method returns array with one item - access it
        let request = requestArr[0];
        if (requestArr.length > 0) {
            res.send({"state": request.status});
        } else {
            // task not found, return error
            res.send({"state": "error, task not found"});
        }
    }
});

// API endpoint called by a car that he has reached the location
app.get('/report', function (req, res) {

    console.log("received a request to the endpoint /report");

    if (!req.query.taskId || !req.query.state) {
        console.log("Error, missing taskId and/or state");
        res.send({"state": "reject, missing taskId and/or state"});
    } else {
        // extract data from the request = task id
        let taskId = JSON.parse(req.taskId.source);
        let state = JSON.parse(req.taskId.state);

        // find the request in the queue
        let requestArr = requestsQueue.filter(function (request) {
            return request.taskId === taskId;
        });
        if (requestArr.length > 0) {
            // filter method returns array with one item - access it
            let request = requestArr[0];
            // find the index of the request in the queue
            let requestIndex = requestsQueue.findIndex(item => item.taskId = taskId);

            // if there was an error while moving the car, we revert the state of the request to the previous one, to allow for a new attempt to move the package
            if (state === "error") {
                if (request.state === "transferToSourceLocation")
                    request.state = "queue";
                else if (request.state === "transferToTargetLocation")
                    request.state = "sourceDispatchFinished";
                else if (request.state === "transferToParking")
                    request.state = "targetDispatchFinished";
            }
            // the car has really reached the location
            else if (state === "done") {

                if (request.state === "transferToSourceLocation") {
                    request.state = "sourceLocation";
                    // send /dispatchRequest to the source plant

                    // make an axios request to the source plant HTTP API
                    console.log("axios GET request URL: " + config.plants[request.sourceLocation - 1].ip + '/dispatch?taskId=' + request.taskId + '&packageId=' + request.packageId);
                    axios.get(config.plants[request.sourceLocation + 1].ip + '/dispatch?taskId=' + request.taskId + '&packageId=' + request.packageId)
                        .then(function (response) {
                            // handle successful request
                            let responseData = JSON.parse(response.data);
                            // the source plant rejects the request
                            if (responseData.state === "reject") {

                                console.log("source plant " + config.plants[request.sourceLocation - 1].ip + " rejected the request");
                                request.state = "sourceDispatchPending";
                            }
                            // the source plant accepts the request, save the dispatch task id and wait for the dispatchFinished message
                            else {
                                request.sourcePlantDispatchId = responseData.dispatchTaskId;
                                console.log("source plant " + config.plants[request.sourceLocation - 1].ip + " accepted the request");
                            }
                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        })
                        .catch(function (error) {
                            // handle error
                            console.log("error when calling source plant " + config.plants[request.sourceLocation + 1].ip + ": " + error);
                            request.state = "sourceDispatchPending";
                        });

                } else if (request.state === "transferToTargetLocation") {
                    request.state = "targetLocation";
                    // send /dispatchRequest to the target plant
                    // make an axios request to the target plant HTTP API
                    console.log("axios GET request URL: " + config.plants[request.targetLocation + 1].ip + '/dispatch?taskId=' + request.taskId + '&packageId=' + request.packageId);
                    axios.get(config.plants[request.targetLocation + 1].ip + '/dispatch?taskId=' + request.taskId + '&packageId=' + request.packageId)
                        .then(function (response) {
                            // handle successful request
                            let responseData = JSON.parse(response.data);
                            // the target plant rejects the request
                            if (responseData.state === "reject") {

                                console.log("target plant " + config.plants[request.targetLocation + 1].ip + " rejected the request");
                                request.state = "targetDispatchPending";
                            }
                            // the target plant accepts the request, save the dispatch task id and wait for the dispatchFinished message
                            else {
                                request.masterPlantDispatchId = responseData.dispatchTaskId;
                                console.log("target plant " + config.plants[request.targetLocation + 1].ip + " accepted the request");
                            }
                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        })
                        .catch(function (error) {
                            // handle error
                            console.log("error when calling target plant " + config.plants[request.targetLocation + 1].ip + ": " + error);
                            request.state = "targetDispatchPending";
                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        });
                } else if (request.state === "transferToParking") {
                    // send /transportFinished request to the package
                    console.log("axios GET request URL: " + request.packageUrl + '/transportFinished?taskId=' + request.taskId);
                    axios.get(request.packageUrl + '/transportFinished?taskId=' + request.taskId)
                        .then(function (response) {
                            // handle successful request
                            let responseData = JSON.parse(response.data);

                            if (responseData.state === "OK") {
                                console.log("/transportFinished request successful, the transport is completed");

                                // update the request data in the queue
                                requestsQueue[requestIndex] = request;
                                // find the request in the queue and delete it
                                let index = requestsQueue.findIndex(item => item.taskId = request.taskId);
                                requestsQueue.splice(index, 1);
                            }
                        })
                        .catch(function (error) {
                            // handle error
                            console.log("error when calling package " + request.packageUrl + ": " + error);

                            request.state = "packageResponsePending";
                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        });
                }
            } else {
                console.log("error, unknown state value in the /report request");
                res.send({"state": "error, unknown state value in the /report request"})
            }

            // update the request data in the queue
            requestsQueue[requestIndex] = request;
        } else {
            // task not found, return error
            res.send({"state": "error, task not found"});
        }
    }

    res.send({"state": "success"});
    console.log("/report endpoint processed successfully");

});

// start the server
app.listen(config.nodejsPort, function () {

    //initialize an array for robot cars' data
    initCars();
    //initialize an array for parkingAreas' data
    initParkingAreas();

    console.log('Robot Cars Control Node.js server listening on port ' + config.nodejsPort + '!');
});

// initialize a cars array when the server starts
function initCars() {

    for (let i = 0; i < config.robotCars.length; i++) {
        let car = {};
        car.id = i + 1;
        car.url = config.robotCars[i].ip;
        car.startLocation = config.robotCars[i].startLocation;
        car.location = config.robotCars[i].startLocation;
        car.available = true;
        cars.push(car);
    }
    console.log("Initial state of robot cars:" + JSON.stringify(cars));
}

// initialize parking areas array when the server starts
function initParkingAreas() {

    for (let i = 0; i < config.parkingAreasLocations.length; i++) {
        let parkingArea = {};
        parkingArea.id = i + 1;
        parkingArea.location = config.parkingAreasLocations[i]
        parkingArea.available = true;
        parkingAreas.push(parkingArea);
    }
    console.log("Initial state of parking areas:" + JSON.stringify(parkingAreas));
}

// randomly select a car for the requested transfer among the cars that are currently available
function selectCar() {

    // make a subset of cars array based on the availability
    let carsAvailable = cars.filter(function (car) {
        return car.available === true;
    });

    // generate a random number between 0 and number of available cars
    let randomNumber = Math.floor(Math.random() * (carsAvailable.length));
    // console.log(randomNumber);

    // randomly select a car for a transfer
    return carsAvailable[randomNumber];
}


// randomly select a parking area among the areas that are currently available
function selectParkingArea() {

    // make a subset of parking areas array based on the availability
    let parkingAreaAvailable = parkingAreas.filter(function (parkingArea) {
        return parkingArea.available === true;
    });

    // generate a random number between 0 and number of available parking areas
    let randomNumber = Math.floor(Math.random() * (parkingAreaAvailable.length));
    // console.log(randomNumber);

    // randomly select a parking area for a transfer
    return parkingAreaAvailable[randomNumber];
}

// periodically check the requests queue and order a transfer to the randomly selected available robot car
setInterval(function () {

    // select a request to process --> choose from requests that are in one of three states: "queue", "sourceDispatchFinished", "targetDispatchFinished"
    // requests are processed on a FIFO (first in first out) principle
    let requestArr = requestsQueue.filter(function (request) {
        return request.state === "queue" || request.state === "sourceDispatchFinished" || request.state === "targetDispatchFinished";
    });

    // a request was found, start processing it
    if (requestArr.length > 0) {
        // filter method returns array with one item - access it
        let request = requestArr[0];

        // move procedure:
        // 1. move the car from its current location to the request source location (master plant or manufacturing plant)
        // 2. wait for the source dispatch operation to finish
        // 3. move the car from the request source location to the request target location
        // 4. wait for the target dispatch operation to finish
        // 5. move to parking area

        // if the car is at the original location, we move the car to the request source location
        let car;
        if (request.state === "queue") {

            // select a robot car
            car = selectCar();
            // TODO: delete this statement, it is used later in the response from the axios GET method call
            // set which car was selected for the transfer (url of the car)
            // carSelected is hardcoded to the localhost (for testing purposes)
            request.carSelected = config.robotCars[4].ip;

        }
        // if a car was selected, proceed with the move
        if (car !== undefined) {

            console.log("selected a car:" + JSON.stringify(car));

            // build axios GET request depending on the current state of the request
            let axiosGetUrl = "";
            if (request.state === "queue") {
                axiosGetUrl = car.url + '/move?sourceLocation' + car.location + '&targetLocation=' + request.sourceLocation + '&taskId=' + request.taskId;
            } else if (request.state === "sourceDispatchFinished") {
                axiosGetUrl = car.url + '/move?sourceLocation' + car.sourceLocation + '&targetLocation=' + request.targetLocation + '&taskId=' + request.taskId;
            } else if (request.state === "targetDispatchFinished") {
                // move the car to a free parking area
                // select a free parking area
                let parkingArea = selectParkingArea();
                if (parkingArea !== undefined) {
                    axiosGetUrl = car.url + '/move?sourceLocation' + car.targetLocation + '&targetLocation=' + parkingArea.location + '&taskId=' + request.taskId;
                } else {
                    // do nothing, make a new attempt in next setInterval iteration
                    axiosGetUrl = "";
                }
            }

            console.log("axios GET request URL: " + axiosGetUrl);
            if (axiosGetUrl !== "") {
                axios.get(axiosGetUrl)
                    .then(function (response) {
                        // handle successful request
                        let responseData = JSON.parse(response.data);
                        // if the selected car is free, the transfer begins, the availability of the car must be set to false and the request is deleted from the queue
                        if (responseData.status === "accept") {
                            // find the index of the car in the cars array
                            let carIndex = cars.findIndex(x => x.id === car.id);
                            // update the availability parameter
                            cars[carIndex].available = false;

                            // if previous state of the request was "queue", it now changes to "transportToSourceLocation"
                            if (request.state === "queue") {
                                request.state = "transportToSourceLocation";
                            } else if (request.state === "sourceDispatchFinished") {
                                request.state = "transportToTargetLocation";
                            } else if (request.state === "targetDispatchFinished") {
                                request.state = "transportToParking";
                            }

                            // find the index of the request in the request array
                            let requestIndex = requestsQueue.findIndex(x => x.taskId === request.taskId);
                            // update the request
                            requestsQueue[requestIndex] = request;

                        }
                        // the car is not available, update its availability
                        else {
                            // find the index of the car in the cars array
                            let carIndex = cars.findIndex(x => x.id === car.id);
                            // update the availability parameter
                            cars[carIndex].available = false;
                        }
                    })
                    .catch(function (error) {
                        // handle error
                        console.log("error when calling robot car " + car.id + " to url " + car.url + ": " + error);
                    });
            } else {
                console.log("no parking area available, will try again later");
            }
        } else {
            console.log("no available cars to carry out the move");
        }
    } else
        console.log("no requests to process");

}, 5000);