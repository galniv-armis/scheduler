import {ObjectId} from "mongodb";

export enum JobType {
    Email = "EMAIL",
    BuildProject = "BUILD_PROJECT",
    MakeCoffee = "MAKE_COFFEE",
    BuyPlainTicket = "BUY_PLANE_TICKET",
}

export interface Job {
    title: string;
    description: string;
    jobType: JobType;

    jobParams?: object;
}

export interface ScheduledJob extends Job {
    cronTime: string | Date;
    // issuerUserId: string; Would have added this after integrating with an auth service (I like Auth0) for role based permissions.

    _id?: ObjectId;
}
