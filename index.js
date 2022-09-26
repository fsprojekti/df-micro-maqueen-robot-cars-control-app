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

// request states:
// 1. queue: when the request is selected for processing, the app chooses a car and sends it to the source location
// 2. transferToSourceLocation: the app is idle and waits for the car to send a message that is has reached the source location
// 3. sourceLocation: car is at the source location, the app calls the source plant to dispatch a package
// 4. sourceDispatchPending: the source plant rejected the dispatch request, try again
// 5. sourceDispatchFinished: the package was dispatched, the app sends the car to the target location
// 6. transferToTargetLocation: the app is idle and waits for the car to send a message that is has reached the target location
// 7. targetLocation: car is at the target location, the app calls the target plant to dispatch a package
// 8. targetDispatchPending: the target plant rejected the dispatch request, try again
// 9. targetDispatchFinished: the package was dispatched, the app sends the car to the selected parking area
// 10. transferToParking: the app is idle and waits for the car to send a message that is has reached the parking area
// 11. parking: car is at the parking area, the app sends transportFinished message to the package
// 12. packageResponsePending: the package rejected the transportFinished request, try again

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

    let packageUrl = req.ip.substring(7, req.ip.length);;
    console.log("received a request to the endpoint /requestTransfer from URL: " + packageUrl);

    if (!req.query.source || !req.query.target || !req.query.packageId || !req.query.offerId) {
        console.log("Error, missing source and/or target location and/or offerId and/or offerId");
        res.send({"state": "reject, missing source and/or target location and/or packageId and/or offerId"});
    } else {
        // extract data from the request = source and target locations for the requested transfer
        let sourceLocation = JSON.parse(req.query.source);
        let targetLocation = JSON.parse(req.query.target);
        let offerId = req.query.offerId;
        let packageId = req.query.packageId;

        // create a request object and add it to the queue
        let reqObject = {}
        reqObject.offerId = offerId;
        reqObject.packageId = packageId;
        reqObject.packageUrl = "http://" + packageUrl + ":3000";
        reqObject.sourceLocation = sourceLocation;
        reqObject.targetLocation = targetLocation;
        reqObject.state = "queue"; // "queue": waiting in the queue; "done": a car has reached the target location

        let queueIndex = requestsQueue.push(reqObject);

        console.log("Current requests queue:" + JSON.stringify(requestsQueue));

        res.send({"state": "accept", "queueIndex": queueIndex, "offerId": reqObject.offerId});
    }
});

// API endpoint called by a package to request a transfer
app.get('/getTask', function (req, res) {

    console.log("received a request to the endpoint /getTask");

    if (!req.query.offerId) {
        console.log("Error, missing offerId");
        res.send({"state": "reject, missing offerId"});
    } else {
        // extract data from the request = task id
        let offerId = JSON.parse(req.query.offerId);

        // find the car in the cars array
        let requestArr = requestsQueue.filter(function (request) {
            return request.offerId === offerId;
        });

        // filter method returns array with one item - access it
        let request = requestArr[0];
        if (requestArr.length > 0) {
            res.send({"state": request.state});
        } else {
            // task not found, return error
            res.send({"state": "error, task not found"});
        }
    }
});

// API endpoint called by a car that he has reached the location
// NOTE: when a car app is called to start the move the taskId used as a parameter is actually a offerId
app.get('/report', function (req, res) {

    console.log("received a request to the endpoint /report");

    if (!req.query.taskId || !req.query.state) {
        console.log("Error, missing taskId and/or state");
        res.send({"state": "reject, missing taskId and/or state"});
    } else {
        // extract data from the request = task id
        let taskId = req.query.taskId;
        let state = req.query.state;

        console.log("task id received: " + taskId);
        console.log("state: " + state);

        // find the request in the queue
        let requestArr = requestsQueue.filter(function (request) {
            return request.offerId === taskId;
        });
        if (requestArr.length > 0) {
            // filter method returns array with one item - access it
            let request = requestArr[0];
            // find the index of the request in the queue
            let requestIndex = requestsQueue.findIndex(item => item.offerId = taskId);

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
                    console.log("axios GET request URL: " + config.plants[request.sourceLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=unload');
                    axios.get(config.plants[request.sourceLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=unload')
                        .then(function (response) {
                            // handle successful request
                            let responseData = response.data;
                            console.log(responseData);

                            // the source plant accepts the request, save the dispatch task id and wait for the dispatchFinished message
                            if (responseData.status === "accept") {
                                // request.sourcePlantDispatchId = responseData.dispatchTaskId;
                                console.log("source plant " + config.plants[request.sourceLocation - 1].url + " accepted the request");
                            }
                            // the source plant rejects the request
                            else if (responseData.status === "reject") {
                                console.log("source plant " + config.plants[request.sourceLocation - 1].url + " rejected the request");
                                request.state = "sourceDispatchPending";
                            } else {
                                console.log("unknown response from source plant " + config.plants[request.sourceLocation - 1].url);
                            }

                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        })
                        .catch(function (error) {
                            // handle error
                            console.log("error when calling source plant " + config.plants[request.sourceLocation - 1].url + ": " + error);
                            request.state = "sourceDispatchPending";
                        });

                } else if (request.state === "transferToTargetLocation") {
                    request.state = "targetLocation";
                    // send /dispatchRequest to the target plant
                    // make an axios request to the target plant HTTP API
                    console.log("axios GET request URL: " + config.plants[request.targetLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=load');
                    axios.get(config.plants[request.targetLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=load')
                        .then(function (response) {
                            // handle successful request
                            let responseData = response.data;

                            // the target plant accepts the request, save the dispatch task id and wait for the dispatchFinished message
                            if (responseData.status === "accept") {
                                // request.sourcePlantDispatchId = responseData.dispatchTaskId;
                                console.log("target plant " + config.plants[request.targetLocation - 1].url + " accepted the request");
                            }
                            // the target plant rejects the request
                            else if (responseData.status === "reject") {
                                console.log("target plant " + config.plants[request.targetLocation - 1].url + " rejected the request");
                                request.state = "targetDispatchPending";
                            } else {
                                console.log("unknown response from target plant " + config.plants[request.targetLocation - 1].url);
                            }

                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        })
                        .catch(function (error) {
                            // handle error
                            console.log("error when calling target plant " + config.plants[request.targetLocation - 1].url + ": " + error);
                            request.state = "targetDispatchPending";
                            // update the request data in the queue
                            requestsQueue[requestIndex] = request;
                        });
                } else if (request.state === "transferToParking") {
                    request.state = "parking";
                    // send /transportFinished request to the package
                    console.log("axios GET request URL: " + request.packageUrl + '/transportFinished?offerId=' + request.offerId);
                    axios.get(request.packageUrl + '/transportFinished?offerId=' + request.offerId)
                        .then(function (response) {
                            // handle successful request
                            let responseData = response.data;

                            if (responseData.status === "success") {
                                console.log("/transportFinished request successful, the transport is completed");

                                // update the request data in the queue
                                requestsQueue[requestIndex] = request;
                                // find the request in the queue and delete it
                                let index = requestsQueue.findIndex(item => item.offerId = request.offerId);
                                requestsQueue.splice(index, 1);
                            } else if (responseData.status === "error") {
                                console.log("/transportFinished request rejected");
                                request.state = "packageResponsePending";
                                // update the request data in the queue
                                requestsQueue[requestIndex] = request;
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
                console.log("/report endpoint processed successfully");
                res.send({"state": "success"});

            } else {
                console.log("error, unknown state value in the /report request");
                res.send({"state": "error, unknown state value in the /report request"})
            }

            // update the request data in the queue
            requestsQueue[requestIndex] = request;
        } else {
            // task not found, return error
            console.log("error, task not found");
            res.send({"state": "error, task not found"});
        }
    }

});

// API endpoint called by a plant (warehouse or manufacturing) to inform the control app that the dispatch of the package has finished
app.get('/dispatchFinished', function (req, res) {

    console.log("received a request to the endpoint /dispatchFinished");

    console.log(req.query);

    if (!req.query.offerId) {
        console.log("Error, missing offerId");
        res.send({"state": "reject, missing offerId"});
    } else {
        // extract data from the request = task id
        let offerId = req.query.offerId;

        // find the request in the requestsQueue array
        let requestArr = requestsQueue.filter(function (request) {
            return request.offerId === offerId;
        });

        // filter method returns array with one item - access it
        let request = requestArr[0];
        if (requestArr.length > 0) {

            if (request.state === "sourceLocation" || request.state === "sourceDispatchPending")
                request.state = "sourceDispatchFinished";
            else if (request.state === "targetLocation" || request.state === "targetDispatchPending")
                request.state = "targetDispatchFinished";

            // get request index in the requestsQueue array and save the updated data
            let requestIndex = requestsQueue.findIndex(x => x.offerId === offerId);
            requestsQueue[requestIndex] = request;

            res.send({"state": "success"});
        } else {
            // task not found, return error
            res.send({"state": "error, task not found"});
        }
    }
});

// start the server
app.listen(config.nodejsPort, function () {

    //initialize an array for robot cars' data
    initCars();
    //initialize an array for parkingAreas data
    initParkingAreas();

    console.log('Robot Cars Control Node.js server listening on port ' + config.nodejsPort + '!');
});

// initialize a cars array when the server starts
function initCars() {

    for (let i = 0; i < config.robotCars.length; i++) {
        let car = {};
        car.id = i + 1;
        car.url = config.robotCars[i].url;
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

    // make a subset of cars' array based on the availability
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

// periodically check the requests queue and order a transfer (move)
setInterval(function () {

    // select a request to process --> choose from requests that are in one of three states: "queue", "sourceDispatchFinished", "targetDispatchFinished"
    // requests are processed on a FIFO (first in first out) principle
    let requestArr = requestsQueue.filter(function (request) {
        return request.state === "queue" || request.state === "sourceDispatchFinished" || request.state === "targetDispatchFinished" || request.state === "sourceDispatchPending" || request.state === "targetDispatchPending" || request.state === "packageResponsePending";
    });

    // a request was found, start processing it
    if (requestArr.length > 0) {
        // filter method returns array with one item - access it
        let request = requestArr[0];
        console.log("processing request: ", request);

        // move procedure:
        // 1. move the car from its current location to the request source location (master plant or manufacturing plant)
        // 2. wait for the source dispatch operation to finish
        // 3. move the car from the request source location to the request target location
        // 4. wait for the target dispatch operation to finish
        // 5. move the car to a parking area

        // if the request is in its original state (queue ) we must select a robot car that will be performed the transport
        //  otherwise the car has already been selected, and we just use it
        if (request.state === "queue") {

            // select a robot car
            // set which car was selected for the transfer (url of the car)
            request.carSelected = selectCar();
            console.log("selected a car:" + JSON.stringify(request.carSelected));
        }

        // if a car was selected, proceed with the move
        if (request.carSelected !== undefined) {

            // build axios GET request depending on the current state of the request
            let axiosGetUrl = "";
            if (request.state === "queue") {
                axiosGetUrl = request.carSelected.url + '/move?source=' + request.carSelected.location + '&target=' + request.sourceLocation + '&taskId=' + request.offerId;
                console.log(axiosGetUrl);
            } else if (request.state === "sourceDispatchFinished") {
                axiosGetUrl = request.carSelected.url + '/move?source=' + request.carSelected.sourceLocation + '&target=' + request.targetLocation + '&taskId=' + request.offerId;
            } else if (request.state === "targetDispatchFinished") {
                // move the car to a free parking area
                // select a free parking area
                let parkingArea = selectParkingArea();
                if (parkingArea !== undefined) {
                    axiosGetUrl = request.carSelected.url + '/move?source=' + request.carSelected.targetLocation + '&target=' + parkingArea.location + '&taskId=' + request.offerId;
                } else {
                    // there are no free parking areas --> do nothing, make a new attempt in next setInterval iteration
                    axiosGetUrl = "";
                }
            }
            // if the current state is a pending dispatch request at source or target plant
            else if (request.state === "sourceDispatchPending") {
                axiosGetUrl = config.plants[request.sourceLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=unload';
            } else if (request.state === "targetDispatchPending") {
                axiosGetUrl = config.plants[request.targetLocation - 1].url + '/dispatch?offerId=' + request.offerId + '&packageId=' + request.packageId + '&mode=load';
            }
            // if the current state is a pending transportFinished request to the package
            else if (request.state === "packageResponsePending") {
                axiosGetUrl = request.packageUrl + '/transportFinished?offerId=' + request.offerId;
            }

            // find the index of the request in the request array
            let requestIndex = requestsQueue.findIndex(x => x.offerId === request.offerId);

            console.log("axios GET request URL:", axiosGetUrl);
            if (axiosGetUrl.includes("move")) {

                console.log("try to move");
                axios.get(axiosGetUrl)
                    .then(function (response) {
                        // handle successful request
                        // console.log("inside then of the axios get");
                        let responseData = response.data;
                        console.log("response from the car:", responseData);
                        // if the selected car is free, the transfer begins, the availability of the car must be set to false and the request is deleted from the queue
                        if (responseData.status === "accept") {
                            // find the index of the car in the cars array
                            let carIndex = cars.findIndex(x => x.id === request.carSelected.id);
                            // update the availability parameter
                            cars[carIndex].available = false;

                            // if previous state of the request was "queue", it now changes to "transferToSourceLocation"
                            if (request.state === "queue") {
                                request.state = "transferToSourceLocation";
                            } else if (request.state === "sourceDispatchFinished") {
                                request.state = "transferToTargetLocation";
                            } else if (request.state === "targetDispatchFinished") {
                                request.state = "transferToParking";
                            }
                            // update the request
                            requestsQueue[requestIndex] = request;
                        }
                        // the car is not available, update its availability
                        else {
                            // find the index of the car in the cars array
                            let carIndex = cars.findIndex(x => x.id === request.carSelected.id);
                            // update the availability parameter
                            cars[carIndex].available = false;
                        }
                    })
                    .catch(function (error) {
                        // handle error
                        console.log("error when calling robot car " + request.carSelected.id + " to url " + request.carSelected.url + " : " + error);
                    });
            } else if (axiosGetUrl.includes("dispatch")) {
                console.log("sending dispatch request: ", axiosGetUrl);
                axios.get(axiosGetUrl)
                    .then(function (response) {
                        // handle successful request
                        let responseData = response.data;
                        console.log("response data: " + responseData);
                        // the target plant rejects the request
                        if (responseData.status === "reject") {

                            console.log("target plant " + config.plants[request.targetLocation - 1].url + " rejected the request");
                            // state of the request does not change

                        }
                        // the target plant accepts the request, save the dispatch task id, change the request state and wait for the dispatchFinished API endpoint call
                        else {
                            // request.masterPlantDispatchId = responseData.dispatchTaskId;
                            console.log("target plant " + config.plants[request.targetLocation - 1].url + " accepted the request");

                            if (request.state === "sourceDispatchPending") {
                                request.state = "sourceLocation";
                            } else if (request.state === "targetDispatchPending") {
                                request.state = "targetLocation";
                            }
                        }
                        // update the request data in the queue
                        requestsQueue[requestIndex] = request;
                    })
                    .catch(function (error) {
                        // handle error
                        console.log("error when calling target plant " + config.plants[request.targetLocation - 1].url + ": " + error);
                        request.state = "targetDispatchPending";
                        // update the request data in the queue
                        requestsQueue[requestIndex] = request;
                    });
            } else if (axiosGetUrl.includes("package")) {
                axios.get(axiosGetUrl)
                    .then(function (response) {
                        // handle successful request

                        console.log("/transportFinished request successful, the transport is completed");

                        // find the request in the queue and delete it
                        let index = requestsQueue.findIndex(item => item.offerId = request.offerId);
                        requestsQueue.splice(index, 1);

                    })
                    .catch(function (error) {
                        // handle error
                        console.log("error when calling package " + request.packageUrl + ": " + error);

                        request.state = "packageResponsePending";
                        // update the request data in the queue
                        requestsQueue[requestIndex] = request;
                    });
            } else if (axiosGetUrl === "") {
                console.log("no parking area available, will try again later");
            }
        } else {
            console.log("no available cars to carry out the move");
        }
    } else
        console.log("no requests to process");

}, 2000);