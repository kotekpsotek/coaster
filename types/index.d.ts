/**
 * Represents REST API Payload for coaster
*/
interface RESTCoaster {
    personel_count: number
    clients_count: number
    distance_meters: number
    /**
     * **both times** are in this form "hour:minute"
    */
    hours: {
        from: string
        to: string
    }
}

type WagonSeats = 32 | 45 | 75;

interface RESTWagon {
    seats: WagonSeats
    speed_m_per_s: number
}
