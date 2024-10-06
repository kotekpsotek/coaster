import type { WagonsSet } from "./wagons";
import { personelSingleWagon, personelCoasterBoarding } from "../config";

type PersonelCoaster = Pick<WagonsSet[0], "wagonType"> & {
    personelCount: number
};

export class Personel {
    wagonsTypesSet: WagonsSet;
    personelCoasterBoarding: number;
    personelPerWagons: PersonelCoaster[] = [];

    constructor(wagonsTypesSet: WagonsSet) {
        this.wagonsTypesSet = wagonsTypesSet;
        this.personelCoasterBoarding = this.getBoardingCoasterPersonel()
    }

    /**
     * @returns {number} Personel needed to handle single coaster on ground like: ticket seller
     * @description Returns personel needed to handle boarding on coaster system
    */
    getBoardingCoasterPersonel() {
        return personelCoasterBoarding;
    }

    boardingCoasterFormat(language: "PL" | "EN") {
        return language === "PL"
        ?
        `Do obsługi kolejki potrzebna jest:\n\t${this.personelCoasterBoarding} osoba/y`
        :
        `To handle coaster is required:\n\t${this.personelCoasterBoarding} person/s`
    }

    /**
     * @returns {Personel}
     * @description  
    */
    wagonsCalculatePersonel()  {
        for (const wagonType of this.wagonsTypesSet) {
            this.personelPerWagons?.push({
                wagonType: wagonType.wagonType,
                personelCount: wagonType.wagonsCount * personelSingleWagon
            })
        }

        return this;
    }
    
    wagonsFormat(language: "PL" | "EN") {
        const prepareArray = (ln: typeof language) => {
            return this.personelPerWagons.map(v => {
                let languageVersion = "";

                switch(ln) {
                    case "PL":
                        languageVersion = `\n\tWagoników ${v.wagonType} osobowych, poterzbnych jest: ${v.personelCount} osób personelu`
                    break;

                    case "EN":
                        languageVersion = `\n\tCoasters for ${v.wagonType} clients, is needed: ${v.personelCount} personel`
                    break;

                    default:
                        throw Error("Unhandled translation language")
                }
                
                return languageVersion
            })
            .join("");
        }
        
        if (language === "PL") {
            return `Do obsługi wagoników:${prepareArray(language)}`;
        }
        else {
            return `To handle wagons:${prepareArray(language)}`;
        }
    }
}
