import { defineStore } from "pinia";
export const useCustomerStore = defineStore({
    id: "customer",
    state() {
        return {
            customers: [
                "All",
                "ADM PLANT 1",
                "ADM PLANT 4",
                "ADM PLANT 5",
                "TMMIN",
                "GMR",
                "MMKI",
                "HMMI",
                "MKM",
                "METINDO",
                "SUZUKI",
                "KTB",
                "PAMINDO",
                "SANWA",
                "HPM",
                "NISSAN",
                "UPIN",
            ],
            destinations: [
                { EXTWG: "2210", EWBEZ: "ADM PLANT 1" },
                { EXTWG: "2211", EWBEZ: "ADM PLANT 4" },
                { EXTWG: "2212", EWBEZ: "ADM PLANT 5" },
                { EXTWG: "2213", EWBEZ: "TMMIN" },
                { EXTWG: "2214", EWBEZ: "GAYA MTR" },
                { EXTWG: "2225", EWBEZ: "MMKI" },
                { EXTWG: "2233", EWBEZ: "HMMI" },
                { EXTWG: "2220", EWBEZ: "MKM" }
            ],
            projects: [
                "D01N",
                "D14N",
                "D17N",
                "D26A",
                "D30D",
                "D40D",
                "D55L",
                "D80N",
                "SL",
                "SU2ID",
            ],
        }
    }, actions: {
        fetchProject(EXTWG) {
            switch (EXTWG) {
                case 2210:
                case 2211:
                case 2212:
                case 2213:
                case 2214:
                    this.projects = [
                        "D01N",
                        "D40D",
                        "D26A",
                        "D17N",
                        "D14N",
                        "D40D",
                        "D30D",
                        "D55L",
                        "D80N",
                    ];
                    break;
                case 2225:
                    this.projects = ["SL"];
                    break;
                case 2233:
                    this.projects = ["SU2ID"];
                    break;
                case 2220:
                    this.projects = ["FM"];
                    break;
            }
        }
    }
})