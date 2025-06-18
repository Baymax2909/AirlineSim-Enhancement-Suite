'use strict';

export function saveFlightInfoToDatabase(message, sender, sendResponse) {
    if (message.content === 'FlightDetails') {

        console.log('Flight details received');

        sendResponse({status: 'Data received!'});
    }


    // This function is a placeholder for saving flight information to a database.
    // The actual implementation would depend on the specific database and its API.
    console.log('Saving flight information to the database...');
    // Example: db.saveFlightInfo(flightInfo);



    return false
}
