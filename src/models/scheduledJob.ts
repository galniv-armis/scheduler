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
    // issuerUserId: string; Would have added this after integrating with an auth service (I like Auth0) for role based permissions.

    cronTime?: string | Date;
    jobParams?: object;
    _id?: ObjectId;
}
