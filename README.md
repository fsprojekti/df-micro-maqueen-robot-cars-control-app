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
|/requestTransfer|JSON object {"parcelId": id, "startLocation": a, "endLocation": b}|sent by a parcel|
|/transferred completed|/|sent by a car when it reaches the location|


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

## Control App Communication Diagram
[![](https://mermaid.ink/img/pako:eNqVVF1r3DAQ_CuLni7gHqHtkykXgtNAaGlMW-7pXmRpnajIkrqSC0fIf68-7PguF8rVGLOyZqWZ2ZWemLASWc08_h7RCLxR_IH4sDMA4DgFJZTjJkAL3KcfAvXJXJPmvtvOxpATNNYEshqunTuBbo-hGZJAGfjNBgT7BwnaGtq8F0gUSqKHYIESRR-AQyBufI-0zmmEIgA9dHx1WUF51-8v8lR82nebTVPPyT-nzE8dbVZFzp2swIfI8asVPChrKkAj50FZJ_444RgXnZRq4M6BG0Ok-YgvPJXJwzgYcZ02fIFfJziSslIJrvUeHFmB_ijdQ0oBa-D27vYeOu6VBx55eNRRcIxBRAd7SznrfyxpoiXbGoYoY3WWcpjEL5_FhrhQqWdiw4VAN9kwM1r86IskFUMPPSFCFkT4KwtSGVJmu9Hvz5AyK9qWIqcsWM37lXVRXrxC3X9ZMIXwjHmrzEf6kmW5F-dCKUIJenJsvfjz7wJMRGaHGjs4jZHFWb2WmodwYnLQbj3Z4aDhyrk6IPLhsvD4eNoM7Rtc4OrqqAEAWMUGpIErGe-Lp3xqWdxvwB2rYyix56MOO7YzzxE6OskDfpYqWGJ1z7XHivEx2B97I1gdaMQZNN05E-r5L_h7elM)](https://mermaid.live/edit#pako:eNqVVF1r3DAQ_CuLni7gHqHtkykXgtNAaGlMW-7pXmRpnajIkrqSC0fIf68-7PguF8rVGLOyZqWZ2ZWemLASWc08_h7RCLxR_IH4sDMA4DgFJZTjJkAL3KcfAvXJXJPmvtvOxpATNNYEshqunTuBbo-hGZJAGfjNBgT7BwnaGtq8F0gUSqKHYIESRR-AQyBufI-0zmmEIgA9dHx1WUF51-8v8lR82nebTVPPyT-nzE8dbVZFzp2swIfI8asVPChrKkAj50FZJ_444RgXnZRq4M6BG0Ok-YgvPJXJwzgYcZ02fIFfJziSslIJrvUeHFmB_ijdQ0oBa-D27vYeOu6VBx55eNRRcIxBRAd7SznrfyxpoiXbGoYoY3WWcpjEL5_FhrhQqWdiw4VAN9kwM1r86IskFUMPPSFCFkT4KwtSGVJmu9Hvz5AyK9qWIqcsWM37lXVRXrxC3X9ZMIXwjHmrzEf6kmW5F-dCKUIJenJsvfjz7wJMRGaHGjs4jZHFWb2WmodwYnLQbj3Z4aDhyrk6IPLhsvD4eNoM7Rtc4OrqqAEAWMUGpIErGe-Lp3xqWdxvwB2rYyix56MOO7YzzxE6OskDfpYqWGJ1z7XHivEx2B97I1gdaMQZNN05E-r5L_h7elM)![](https://mermaid.ink/img/pako:eNqVVFFr3DAM_ivCT1fIjtLtKYwrI-1D2djCNu7pXny20roktic7g1L63yfbSXO3K-MWQrCtT9L3SXKehXIaRS0C_hrRKrwx8p7ksLMA4CVFo4yXNkILMqQDhf2JrUm2727veCkJGmcjuR4-eX8C3R5DMySBMvCriwjuNxK0NbQ5F2hURmOA6IASxRBBQiRpQ4e0zm6EKgLd7-XqsoLyrq8usomf9t1m09Sz88_J8-OeNqsi505XECJz_OKUjMbZCtDqeVPi8MEJRw46Ke1Beg9-jEzzAV95Gpu3vBlxnRK-wlk2BOyZd2A1igvROcrg_1HWsLJtDQOzWZ0lACYNy2dRw4FKWxIbqRT6Sc3MaJHVQRIDhpcBOkIEkBye8DELMhlSrPsxPJ0hZVa0Lb1KXrCa85W4qC_-Qn37vGAK4RnzVreO9KWS5ZGa22UINfRTxdZLff7dgInIXKHGDb5HZnHWyKQZIJyYHExNR244mJtyPQ6IvL8sPD6cDkP7Bhe4vj4aAABRiQFpkEbztX_Ol09wvgF3oualxk6OfdyJnX1h6Oi1jHirTXQk6k72ASshx-h-PFkl6kgjzqDp1zGhXv4AVNNl4g)](https://mermaid.live/edit#pako:eNqVVFFr3DAM_ivCT1fIjtLtKYwrI-1D2djCNu7pXny20roktic7g1L63yfbSXO3K-MWQrCtT9L3SXKehXIaRS0C_hrRKrwx8p7ksLMA4CVFo4yXNkILMqQDhf2JrUm2727veCkJGmcjuR4-eX8C3R5DMySBMvCriwjuNxK0NbQ5F2hURmOA6IASxRBBQiRpQ4e0zm6EKgLd7-XqsoLyrq8usomf9t1m09Sz88_J8-OeNqsi505XECJz_OKUjMbZCtDqeVPi8MEJRw46Ke1Beg9-jEzzAV95Gpu3vBlxnRK-wlk2BOyZd2A1igvROcrg_1HWsLJtDQOzWZ0lACYNy2dRw4FKWxIbqRT6Sc3MaJHVQRIDhpcBOkIEkBye8DELMhlSrPsxPJ0hZVa0Lb1KXrCa85W4qC_-Qn37vGAK4RnzVreO9KWS5ZGa22UINfRTxdZLff7dgInIXKHGDb5HZnHWyKQZIJyYHExNR244mJtyPQ6IvL8sPD6cDkP7Bhe4vj4aAABRiQFpkEbztX_Ol09wvgF3oualxk6OfdyJnX1h6Oi1jHirTXQk6k72ASshx-h-PFkl6kgjzqDp1zGhXv4AVNNl4g)