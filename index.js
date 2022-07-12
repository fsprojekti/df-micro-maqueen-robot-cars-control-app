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

// API endpoint called by a parcel to request a transfer
app.get('/requestTransfer', function (req, res) {

    console.log("received a request to the endpoint /requestTransfer");

    if (!req.query.id || !req.query.startLocation || !req.query.endLocation) {
        console.log("Error, missing id and/or startLocation and/or endLocation.");
        res.send("Error, missing id and/or startLocation and/or endLocation.");
    } else {
        // extract data from the request = parcel id and start and end locations for the requested transfer
        let parcelId = JSON.parse(req.query.id);
        let startLocation = JSON.parse(req.query.startLocation);
        let endLocation = JSON.parse(req.query.endLocation);

        // create a request object and add it to the queue
        let reqObject = {}
        reqObject.parcelId = parcelId
        reqObject.startLocation = startLocation;
        reqObject.endLocation = endLocation;
        reqObject.status = "queue"; // "queue": waiting in the queue; "transfer": a car is on the move to fulfill a request

        requestsQueue.push(reqObject);

        console.log("Current requests queue:" + JSON.stringify(requestsQueue));

        res.send("/requestTransfer endpoint processed successfully");
    }
});

// API endpoint called by a car that he has reached the end location of the transfer and is now available for the next transfer
app.get('/transferCompleted', function (req, res) {

    console.log("received a request to the endpoint /transferCompleted");

    let robotCarIp = req.ip.substring(7, req.ip.length);
    console.log(robotCarIp);

    // find the request in the queue and delete it
    let index = requestsQueue.findIndex(item => item.url = robotCarIp);
    requestsQueue.splice(index, 1);

    // find the car in the cars array
    let carArr = cars.filter(function (car) {
        return car.url === robotCarIp;
    });
    // filter method returns array with one item - access it
    let car = carArr[0];

    // TODO: does the car automatically move to the parking area? or does he wait for the next transfer at the production area?
    // TODO: for now: the car moves to the parking areas

    // select a free parking area
    let parkingArea = selectParkingArea();
    if (parkingArea !== undefined) {

        // call car's HTTP API endpoint /move
        console.log("selected the area:" + JSON.stringify(parkingArea));
        // make an axios request to the robot car HTTP API
        console.log("axios GET request URL: " + car.url + '/move?startLocation=' + car.location + '&endLocation=' + parkingArea.location);
        axios.get(car.url + '/move?startLocation' + car.location + '&endLocation=' + parkingArea.location)
            .then(function (response) {
                // handle successful request
                let responseData = JSON.parse(response.data);
                // if the selected car is free, the transfer begins, the availability of the car must be set to false and the request is deleted from the queue
                if (responseData.available) {
                    // find the index of the car in cars array
                    let carIndex = cars.findIndex(item => item.url = car.url);
                    // update the availability parameter
                    cars[carIndex].available = false;

                    // find the index of the parking area in parkingAreas array
                    let parkingAreaIndex = parkingAreas.findIndex(x => x.id === parkingArea.id);
                    // update the availability parameter
                    parkingArea[parkingAreaIndex].available = false;

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

    }
    // no free parking areas found, put the data to a parking area transfer queue
    else {
        parkingAreasTransfersQueue.push({"carIp": robotCarIp});
    }

    res.send("/transferCompleted endpoint processed successfully");

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

    for (let i = 0; i < config.robotCarsIpAddresses.length; i++) {
        let car = {};
        car.id = i + 1;
        car.url = config.robotCarsIpAddresses[i]
        car.startLocation = config.robotCarsStartLocations[i]
        car.location = config.robotCarsStartLocations[i]
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

    if (requestsQueue.length > 0) {
        // requests are processed on a FIFO (first in first out) principle
        // select a robot car
        let car = selectCar();
        // TODO: delete this statement, it is used later in the response from the axios GET method call
        // set which car was selected for the transfer (url of the car)
        // carSelected is hardcoded to the localhost (for testing purposes)
        requestsQueue[0].carSelected = config.robotCarsIpAddresses[4];

        if (car !== undefined) {
            console.log("selected a car:" + JSON.stringify(car));
            // make an axios request to the robot car HTTP API
            console.log("axios GET request URL: " + car.url + '/move?startLocation=' + requestsQueue[0].startLocation + '&endLocation=' + requestsQueue[0].endLocation);
            axios.get(car.url + '/move?startLocation' + requestsQueue[0].startLocation + '&endLocation=' + requestsQueue[0].endLocation)
                .then(function (response) {
                    // handle successful request
                    let responseData = JSON.parse(response.data);
                    // if the selected car is free, the transfer begins, the availability of the car must be set to false and the request is deleted from the queue
                    if (responseData.available) {
                        // find the index of the car in the cars array
                        let carIndex = cars.findIndex(x => x.id === car.id);
                        // update the availability parameter
                        cars[carIndex].available = false;
                        // set the status of the request to "transfer" - the request is only deleted from the queue after the transfer is completed
                        requestsQueue[0].status = "transfer";
                        // set which car was selected for the transfer (url of the car)
                        requestsQueue[0].carSelected = car.url;
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

        } else
            console.log("no available cars to carry out the transfer")

    } else
        console.log("no requests to process");

}, 5000);