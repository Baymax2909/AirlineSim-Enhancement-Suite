class AircraftFlight {
    #serverName
    #airlineId
    #routeData

    constructor() {
        this.#serverName = AES.getServerName();
        this.#airlineId = AES.getAirline().id;
        this.#routeData = [];
    }

    init() {
        this.#collectRouteData();
        this.#sendDataToBackground()
    }

    /**
     * Collects departure and arrival data from the flights table and sends it directly to database handler
     */
    #collectRouteData() {
        const rows = document.querySelectorAll('#aircraft-flight-instances-table tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;

            const flightNumber = cells[1]?.querySelector('span')?.textContent?.trim() || '';
            const depCode = cells[2].querySelector('span')?.textContent?.trim() || '';
            const depTimeRaw = cells[3].querySelector('span')?.getAttribute('title') || '';
            const arrCode = cells[4].querySelector('span')?.textContent?.trim() || '';
            const arrTimeRaw = cells[5].querySelector('span')?.getAttribute('title') || '';

            const depTime = this.#parseDateTime(depTimeRaw);
            const arrTime = this.#parseDateTime(arrTimeRaw);

            const flightLink = cells[12]?.querySelector('td a[href*="flight?id="]');
            const flightId = flightLink
                ? parseInt(new URL(flightLink.href, location.origin).searchParams.get('id'), 10)
                : null;

            if (flightId && depCode && arrCode && depTime && arrTime) {
                this.#routeData.push({
                    server: this.#serverName,
                    airlineId: this.#airlineId,
                    flightId: flightId,
                    flightNumber: flightNumber,
                    origin: depCode,
                    departureTime: depTime,
                    destination: arrCode,
                    arrivalTime: arrTime})
            }
        });
    }

    /**
     * Parses date string like "21.06. 03:59 UTC" to number format MMDDhhmm
     * @param {string} datetimeStr
     * @returns {number|null}
     */
    #parseDateTime(datetimeStr) {
        const match = datetimeStr.match(/(\d{2})\.(\d{2})\.\s+(\d{2}):(\d{2})/);
        if (!match) return null;
        const [, day, month, hour, minute] = match;
        return parseInt(`${month}${day}${hour}${minute}`, 10);
    }

    #sendDataToBackground() {
        this.#routeData.forEach( flight => {
            this.#sendMessage({
                content: 'FlightDetails',
                type: 'save',
                data: flight
            })
                .then(response => {
                    console.log("Save response:", response);
                })
                .catch(err => {
                    console.error("Failed to send message:", err.message);
                });
        });
    }

    #sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                resolve(response);
            });
        });
    }
}

new AircraftFlight().init();
