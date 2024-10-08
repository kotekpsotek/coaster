export interface ConsoleStatisticsCoaster {
    coaster_id: string
    avaiableCoasters: number
    avaiableWagons: number
    avaiablePersonel: number
    clientsLoad: number
}

interface StatData {
    name: string
    coaster_id: string
    wagons: number
    personel: number
    customers: number
}

/** Display coaster statistics in console */
export default function consoleStatistics(coatstersStats: ConsoleStatisticsCoaster[]) {
    const statData: StatData[] = [];

    let coasterNum = 1;
    for (const statCoaster of coatstersStats) {
        statData.push(
            { name: `Coaster ${coasterNum}`, coaster_id: statCoaster.coaster_id, wagons: statCoaster.avaiableWagons, personel: statCoaster.avaiablePersonel, customers: statCoaster.avaiablePersonel },
        );
        coasterNum += 1;
    }
    
    console.table(statData);

    return statData;
}