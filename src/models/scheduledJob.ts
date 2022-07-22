import {ObjectId} from "mongodb";

export enum JobType {
    Email = "EMAIL",
    BuildProject = "BUILD_PROJECT",
    MakeCoffee = "MAKE_COFFEE",
    BuyPlainTicket = "BUY_PLANE_TICKET",
}

export interface ScheduledJob {
    title: string;
    description: string;
    jobType: JobType;
    issuerUserId: string;
    cron?: string;
    jobParams?: object;
    _id?: ObjectId;
}
