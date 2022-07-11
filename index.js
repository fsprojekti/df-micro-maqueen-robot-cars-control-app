const express = require('express');
const app = express();
const axios = require('axios').default;

// add timestamps in front of all log messages
require('console-stamp')(console, '[HH:MM:ss.l]');

// open file with configuration data
const fs = require('fs');
const config = require("./config.json");

// global variables
let cars = [];
let requestsQueue = [];

// #### API ENDPOINTS ####

// default API endpoint, returns a message that the server is up and running
app.get('/', function (req, res) {

    console.log("Received a request to the endpoint /");
    res.send("Robot Cars Control Node.js server is up and running.");

});

// API endpoint that returns current value of the requests queue
app.get('/get/requestsQueue', function (req, res) {

    console.log("received a request to the endpoint /get/requestsQueue");
    res.send(JSON.stringify(requestsQueue));

});

// API endpoint that returns current value of the cars data
app.get('/get/cars', function (req, res) {

    console.log("received a request to the endpoint /get/cars");
    res.send(JSON.stringify(cars));

});

// API endpoint called by a parcel to request a transfer
app.get('/requestTransfer', function (req, res) {

    console.log("received a request to the endpoint /requestTransfer");

    if (!req.query.startLocation || !req.query.endLocation || !req.query.id) {
        console.log("Error, missing id and/or startLocation and/or endLocation.");
        res.send("Error, missing id and/or startLocation and/or endLocation.");
    } else {
        // extract data from the request = parcel id and start and end locations for the requested transfer
        let id = JSON.parse(req.query.id);
        let startLocation = JSON.parse(req.query.startLocation);
        let endLocation = JSON.parse(req.query.endLocation);

        // create a request object and add it to the queue
        let request = {"parcelId": id, "startLocation": startLocation, "endLocation": endLocation};
        requestsQueue.push(request);

        console.log("Current requests queue:" + JSON.stringify(requestsQueue));

        res.send("/requestTransfer endpoint processed successfully");
    }
});

// API endpoint called by a car that he has reached the end location of the transfer and is now available for the next transfer
app.get('/transferCompleted', function (req, res) {

    console.log("received a request to the endpoint /transferCompleted");

    if (!req.query.id || !req.query.endLocation) {
        console.log("Error, missing id.");
        res.send("Error, missing startLocation and/or endLocation.");
    } else {
        // extract data from the request = start and end locations for the requested transfer
        let startLocation = JSON.parse(req.query.startLocation);
        let endLocation = JSON.parse(req.query.endLocation);

        // create a request object and add it to the queue
        let request = {"startLocation": startLocation, "endLocation": endLocation};
        requestsQueue.push(request);

        console.log("Current requests queue:" + JSON.stringify(requestsQueue));

        res.send("/requestTransfer endpoint processed successfully");
    }
});

// start the server
app.listen(config.nodejsPort, function () {

    //initialize an array for robot cars' data
    initCars();

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
        car.available = false;
        cars.push(car);
    }
    console.log("Initial state of robot cars:" + JSON.stringify(cars));
}

// randomly select a car for the requested transfer among the cars that are currently available
function selectCar() {

    let carsAvailable = cars.filter(function (car) {
        return car.available === true;
    });

    // generate a random number between 0 and number of available cars - 1
    let randomNumber = Math.floor(Math.random() * (carsAvailable.length));
    // console.log(randomNumber);

    return carsAvailable[randomNumber];
}

// periodically check the requests queue and order a transfer to the randomly selected available robot car
setInterval(function () {

    if (requestsQueue.length > 0) {
        // requests are processed on a FIFO (first in first out) principle
        let request = requestsQueue[0];
        // select a robot car
        let car = selectCar();
        if (car !== undefined) {
            console.log("selected a car:" + JSON.stringify(car));
            // make an axios request to the robot car HTTP API
            console.log("axios GET request URL: " + car.url + '/move?startLocation=' + request.startLocation + '&endLocation=' + request.endLocation);
            axios.get(car.url + '/move?startLocation' + request.startLocation + '&endLocation=' + request.endLocation)
                .then(function (response) {
                    // handle successfull request
                    let responseData = JSON.parse(response.data);
                    // if selected car is free, the transfer begins, the availability of the car must be set to false and the request is deleted from the queue
                    if (responseData.available) {
                        // find the index of the car in the cars array
                        let carIndex = cars.findIndex(x => x.id === car.id);
                        // update the availability parameter
                        cars[carIndex].available = false;
                        // delete the request from the queue
                        requestsQueue.shift();
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