export function checkHourFormat(hourFormat: string) {
    if (typeof hourFormat !== "string") return false;

    const devTwo = hourFormat.split(":");
    const hour = Number(devTwo[0]);
    const min = Number(devTwo[1]);

    const hourCond = hour <= 23 && hour >= 0;
    const minCond = min <= 59 && min >= 0;

    if (hourCond && minCond) {
        return true;
    }
    else return false;
}

/**
 * @param param0 
 * @param minRouteTimeM 
 * @returns {boolean} - is correct true is confused false
 * @description Check correcteness of hours range
 */
export function checkHoursRange({ from, to }: RESTCoaster["hours"], minRouteTimeM?: number) {
    // from
    const fS = from.split(":");
    const [fHour, fMinute] = [Number(fS[0]), Number(fS[1])];

    // to
    const tS = to.split(":");
    const [tHour, tMinute] = [Number(tS[0]), Number(tS[1])];

    // Logic
    if ((tHour > fHour || (tHour === fHour && tMinute > fMinute))) {
        if (minRouteTimeM) {
            const timeLong = (tHour * 60 + tMinute) - (fHour * 60 + fMinute);

            if (timeLong < minRouteTimeM) {
                return false
            }
        }

        return true;
    }

    return false;
}