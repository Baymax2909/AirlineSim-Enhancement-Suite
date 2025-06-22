class EnterpriseEventOverview {
    #flights;

    constructor() {
        this.#flights = [];
    }

    init() {
        this.#getDataFromDatabase()
    }

    /**
     *
     *
     * Load flight data
     *
     *
     */

    #getDataFromDatabase() {

        const {earliest, latest} = this.#getNowAndFuture72Hours()
        this.#sendMessage({
        content: 'FlightDetails',
        type: 'loadMultiple',
        data: {
            server: AES.getServerName(),
            airlineId: AES.getAirline().id,
            flightId: 0, //not needed but to fill the expected value in a background job
            earliest: earliest,
            latest: latest
        }
        })
            .then(response => {
                this.#flights = response.data;
                console.log("Save response:", response);
                this.#renderTable();

            })
            .catch(err => {
                console.error("Failed to send message:", err.message);
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

    /**
     * Returns two timestamps:
     * - earliest: current time
     * - latest: current time + 72 hours
     * Format: MMDDhhmm as a number
     * @returns {{ earliest: number, latest: number }}
     */
    #getNowAndFuture72Hours() {
        const now = new Date();
        const future = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours ahead

        const formatUTCDate = (date) => {
            const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
            const DD = String(date.getUTCDate()).padStart(2, '0');
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');
            return parseInt(`${MM}${DD}${hh}${mm}`, 10);
        };

        return {
            earliest: formatUTCDate(now),
            latest: formatUTCDate(future)
        };
    }

    /**
     *
     *
     * Render table
     *
     *
     */

    #renderTable() {
        const table = document.querySelector('div div div table.table');
        if (!table || !this.#flights || !this.#flights.length) return;

        this.#renderFlightsToFinancialsTable(table)
        this.#updateRunningBalance(table)
    }

    /**
     *
     *
     * Insert flight data into table
     *
     *
     */

    // TODO: Extracted flight data is always in UTC, this table is localized to time settings.
    //  Need to consider to force user using english as language and UTC as time?
    #renderFlightsToFinancialsTable(table) {

        this.#ensureDateGroupsForNext72Hours();

        const flightsByLabel = {};

        this.#flights.forEach(flight => {
            const label = this.#getDateLabelFromFlight(flight.departureTime);
            if (!flightsByLabel[label]) flightsByLabel[label] = [];
            flightsByLabel[label].push(flight);
        });

        Object.entries(flightsByLabel).forEach(([label, flights]) => {
            const tbody = this.#getOrCreateTbodyForDateLabel(table, label);

            // Exclude the row with the <th> (first row)
            const otherRows = Array.from(tbody.querySelectorAll('tr')).slice(1);

            // Create and collect new rows
            const newRows = [];
            flights.sort((a, b) => parseInt(a.departureTime) - parseInt(b.departureTime))
                .forEach(flight => {
                    newRows.push(this.#createFlightRow('departure', flight));
                });

            // Insert rows in correct order based on time
            newRows.forEach(row => {
                const rowTime = row.firstChild?.textContent.trim();
                const insertionIndex = otherRows.findIndex(existing => {
                    const existingTime = existing.children[0]?.textContent.trim();
                    return existingTime && rowTime < existingTime;
                });
                if (insertionIndex === -1) {
                    tbody.appendChild(row);
                } else {
                    tbody.insertBefore(row, otherRows[insertionIndex]);
                    otherRows.splice(insertionIndex, 0, row);
                }
            });

            // Update rowspan of <th>
            const allRows = tbody.querySelectorAll('tr');
            const th = allRows[0]?.querySelector('th');
            if (th) {
                th.setAttribute('rowspan', allRows.length);
            }
        });
    }

    /**
     * Ensures that the table contains date-group <tbody> sections
     * for every UTC day in the next 72 hours.
     */
    #ensureDateGroupsForNext72Hours() {
        const table = document.querySelector('div div div table.table');
        if (!table) return;

        const existingLabels = Array.from(table.querySelectorAll('tbody > tr > th'))
            .map(th => th.textContent.trim());

        const now = new Date();
        const end = new Date(now.getTime() + 72 * 60 * 60 * 1000); // now + 72 hours

        const dateSet = new Set();

        for (let d = new Date(now); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
            const DD = String(d.getUTCDate()).padStart(2, '0');
            const label = this.#getDateLabelFromFlight(parseInt(`${MM}${DD}0000`, 10));

            if (!existingLabels.includes(label)) {
                const tbody = document.createElement('tbody');
                const row = document.createElement('tr');
                const th = document.createElement('th');
                th.setAttribute('rowspan', '1');
                th.textContent = label;
                row.appendChild(th);
                tbody.appendChild(row);

                // Insert in correct date order
                const insertionPoint = Array.from(table.querySelectorAll('tbody')).find(otherTbody => {
                    const th = otherTbody.querySelector('th');
                    const otherLabel = th?.textContent.trim();
                    if (!otherLabel) return false;

                    const otherDate = this.#parseDateLabelToDate(otherLabel);
                    return d < otherDate;
                });

                if (insertionPoint) {
                    table.insertBefore(tbody, insertionPoint);
                } else {
                    table.appendChild(tbody);
                }

                existingLabels.push(label);
            }
        }
    }

    /**
     * Gets or creates a <tbody> section for the given date label
     * @param {HTMLTableElement} table
     * @param {string} label - e.g., "Monday, 23.06."
     * @returns {HTMLTableSectionElement}
     */
    #getOrCreateTbodyForDateLabel(table, label) {
        const existingTbody = Array.from(table.querySelectorAll('tbody')).find(tbody => {
            const rowWithTh = Array.from(tbody.querySelectorAll('tr')).find(tr => {
                const th = tr.querySelector('th');
                return th && th.textContent.trim() === label;
            });

            if (rowWithTh) {
                const th = rowWithTh.querySelector('th');
                const headerRow = document.createElement('tr');
                headerRow.appendChild(th.cloneNode(true));

                const contentRow = rowWithTh.cloneNode(true);
                const thInContentRow = contentRow.querySelector('th');
                if (thInContentRow) thInContentRow.remove();

                // Insert both rows at the beginning of tbody
                tbody.insertBefore(contentRow, tbody.firstChild);
                tbody.insertBefore(headerRow, tbody.firstChild);

                // Remove the original mixed row
                rowWithTh.remove();

                return true; // this tbody is the one we're looking for
            }

            return false;
        });


        if (existingTbody) return existingTbody;

        // Create new tbody and initial row with <th>
        const newTbody = document.createElement('tbody');
        const row = document.createElement('tr');
        const th = document.createElement('th');
        th.setAttribute('rowspan', '1'); // placeholder, will adjust later
        th.textContent = label;
        row.appendChild(th);
        newTbody.appendChild(row);
        table.appendChild(newTbody);

        return newTbody;
    }


    /**
     * Creates a table row for either a flight departure or arrival
     * @param {'departure'|'arrival'} type
     * @param {Object} flight
     * @returns {HTMLTableRowElement}
     */
    #createFlightRow(type, flight) {
        const row = document.createElement('tr');

        // Flight time from departureTime or arrivalTime
        const flightTimeNum = type === 'departure' ? flight.departureTime : flight.arrivalTime;
        const minutes = this.#parseTimeFromFlightTime(flightTimeNum);
        row.dataset.flightTime = minutes;  // store for sorting

        // Time cell
        const timeStr = this.#formatTime(flightTimeNum);
        row.appendChild(this.#createTimeCell(timeStr));

        // Description
        const airport = type === 'departure' ? flight.origin : flight.destination;
        const description = `Flight <strong>${flight.flightNumber}</strong> ${type} at <strong>${airport}</strong> (ID: ${flight.flightId})`;
        row.appendChild(this.#createDescriptionCell(description));

        // Credit / Debit / Balance placeholders
        const finLabels = ['credit', 'debit', 'balance']
        finLabels.forEach(finLabel => {
            row.appendChild(this.#createFinanceCell(finLabel, flight));
        })
        return row;
    }


    /**
     * Creates the time cell
     * @param {string} time - formatted as HH:MM
     * @returns {HTMLTableCellElement}
     */
    #createTimeCell(time) {
        const td = document.createElement('td');
        td.textContent = time;
        return td;
    }

    /**
     * Creates the description cell
     * @param {string} content - HTML content allowed
     * @returns {HTMLTableCellElement}
     */
    #createDescriptionCell(content) {
        const td = document.createElement('td');
        td.innerHTML = content;
        return td;
    }

    /**
     * Creates a single cell for financial placeholders (-- / AS$)
     * @param {'credit'|'debit'|'balance'} type
     * @param {Object} flight
     * @returns {HTMLTableCellElement}
     */
    #createFinanceCell(type, flight) {
        const td = document.createElement('td');
        const span = document.createElement('span');
        td.classList.add('number');

        if (flight.money) {
            // unsafe parsing of raw data
            const cm2Total = parseInt(flight.money.CM2.Total)

            if (type === 'credit' && cm2Total >= 0) {
                span.textContent = cm2Total.toLocaleString(); // TODO: Use localization setting from AS
                span.setAttribute('class', 'good')
                td.appendChild(span);
                td.append(' AS$');
            } else if (type === 'debit' && cm2Total < 0) {
                span.textContent = cm2Total.toLocaleString(); // TODO: Use localization setting from AS
                span.setAttribute('class', 'bad')
                td.appendChild(span);
                td.append(' AS$');
            } else {
                td.innerHTML = '-- AS$';
            }
        } else {
            td.innerHTML = '-- AS$';
        }

        return td;
    }

    /**
     * Converts time in MMDDhhmm format to HH:MM string
     * @param {number} flightTimeNumber
     * @returns {string}
     */
    #formatTime(flightTimeNumber) {
        const minutes = String(flightTimeNumber).slice(-2);
        const hours = String(flightTimeNumber).slice(-4, -2);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Converts MMDDhhmm (as integer) to "Day, DD.MM." label
     * @param {number} mmddhhmm
     * @returns {string}
     */
    #getDateLabelFromFlight(mmddhhmm) {
        const str = mmddhhmm.toString().padStart(8, '0'); // Ensure MMDDhhmm format

        const MM = parseInt(str.slice(0, 2), 10);
        const DD = parseInt(str.slice(2, 4), 10);
        const now = new Date();
        const year = now.getUTCFullYear();

        const date = new Date(Date.UTC(year, MM - 1, DD));

        // TODO: Use localization setting from AS for the day Name
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const formatted = `${String(DD).padStart(2, '0')}.${String(MM).padStart(2, '0')}.`;

        return `${dayName}, ${formatted}`;
    }

    /**
     * Parse time (minutes since midnight UTC) from MMDDhhmm integer
     * @param {number} mmddhhmm - e.g. 06221438 for June 22, 14:38 UTC
     * @returns {number} minutes since midnight
     */
    #parseTimeFromFlightTime(mmddhhmm) {
        const minutes = String(mmddhhmm).slice(-2);
        const hours = String(mmddhhmm).slice(-4, -2);

        const hh = parseInt(hours);
        const mm = parseInt(minutes);
        return hh * 60 + mm;
    }

    #parseDateLabelToDate(label) {
        const [, ddmm] = label.split(', ');
        const [DD, MM] = ddmm.replace('.', '').split('.').map(Number);
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), MM - 1, DD));
    }

    /**
     *
     *
     * Calculate balance column
     *
     *
     */

    #updateRunningBalance(tableElement) {
        const tbodies = tableElement.querySelectorAll('tbody');
        let balance = this.#extractStartingBalance();

        tbodies.forEach(tbody => {
            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return; // skip headers or malformed rows

                const creditTd = cells[2];
                const debitTd = cells[3];
                const balanceTd = cells[4];

                const credit = this.#extractAmount(creditTd);
                const debit = this.#extractAmount(debitTd);

                balance += credit - debit;

                // Clear and insert balance
                balanceTd.innerHTML = '';
                const span = document.createElement('span');
                span.textContent = this.#formatMoney(balance);
                span.className = balance >= 0 ? 'good' : 'bad';
                balanceTd.appendChild(span);
                balanceTd.append(' AS$');
            });
        });
    }

    #extractAmount(td) {
        const span = td.querySelector('span');
        if (span && span.textContent.trim()) {
            return this.#parseMoneyText(span.textContent);
        }
        return 0;
    }

    #extractStartingBalance() {
        const balanceAnchor = document.querySelector('.navbar .balance');
        if (!balanceAnchor) return 0;

        const span = balanceAnchor.querySelector('span');
        if (!span || !span.textContent.trim()) return 0;

        return this.#parseMoneyText(span.textContent.trim());
    }

    #parseMoneyText(text) {
        // Remove thousand separators (dot or comma), remove spaces, and convert to float
        return parseFloat(
            text.replace(/[.,](?=\d{3}\b)/g, '') // Remove thousand separators
                .replace(/[^\d\-]/g, '')         // Remove non-numeric except dash
        ) || 0;
    }

    #formatMoney(value) {
        return value.toLocaleString();
    }


}

new EnterpriseEventOverview().init();
