'use strict';
import { FlightDetailsStore } from './flightDetailsStore.js';

/**
 * Handles incoming flight information messages.
 * @param message
 * @param sender
 * @returns {Promise<{success: boolean}|{success: boolean, error: string}|{success: boolean, error}>}
 */
export async function handleFlightInfoMessage(message, sender) {
    if (message.content !== 'FlightDetails') {
        return { success: false, error: `Unexpected message content: ${message.content}` };
    }

    const serverName = message.data.server;
    const flightId = message.data.flightId;
    const flightData = message.data;

    try {
        await FlightDetailsStore.save(serverName, flightId, flightData);
        console.log(`Saved ${flightId} to ${serverName}FlightDatabase`);
        return { success: true };
    } catch (error) {
        console.error('Failed to save flight:', error);
        return { success: false, error: error.message };
    }
}

// In message.data, we expect flight information to be present.
/**
 * {
 *     server: "Bleriot",
 *     flightId: "314826",
 *     type: "flightInfo",
 *     money: {
 *          CM1: {
 *              Y: 0,
 *              C: 0,
 *              F: 0,
 *              PAX: 0,
 *              Cargo: 0,
 *              Total: 0
 *          }
 *     },
 *     date: "20240607",
 *     time: "16:24 UTC",
 *     flightLoad: {
 *          bookings:{
 *             Y: 0,
 *             C: 0,
 *             F: 0,
 *             PAX: 0,
 *             C: 0
 *        },
 *          feedersAndConnections: {
 *             PAX: 0,
 *             Cargo: 0
 *        }
 *     }
 * }
 */
