import {CronJob} from 'cron';
import {Collection, ObjectId, Filter} from "mongodb";

import {ScheduledJob, JobType} from "../models/scheduledJob";

type DataProvider = Collection<ScheduledJob> // | more types

const JOB_TYPE_TO_ACTION = new Map<JobType, (scheduledJobParams: object) => void>([
    [JobType.Email, (scheduledJobParams: object) => console.log(`Sending email with config  ${JSON.stringify(scheduledJobParams)}`)],
    [JobType.BuildProject, (scheduledJobParams: object) => console.log(`Building a project with config ${JSON.stringify(scheduledJobParams)}`)],
    [JobType.MakeCoffee, (scheduledJobParams: object) => console.log(`Making coffee with config ${JSON.stringify(scheduledJobParams)}`)],
    [JobType.BuyPlainTicket, (scheduledJobParams: object) => console.log(`Buying a plane ticket with config ${JSON.stringify(scheduledJobParams)}`)],
])

class ScheduledJobsService {
    _scheduledJobs: Map<string, CronJob>;
    _dataProvider: DataProvider;

    constructor() {
        this._scheduledJobs = new Map<string, CronJob>();
    }

    async setup(dataProvider: DataProvider) {
        this._dataProvider = dataProvider;

        const activeJobsQuery: Filter<ScheduledJob> = {$or: [{cronTime: {$gt: new Date()}}, {cronTime: {$type: "string"}}]};
        const scheduledJobs = await this.getAllAsArray(activeJobsQuery);
        scheduledJobs.forEach((scheduledJob: ScheduledJob) => {
            try {
                this.setCron(scheduledJob);
            } catch (e) {
                console.log(`Failed to schedule job with id: ${scheduledJob._id}`)
                console.log(e);
            }

        })
    }

    async getAllAsArray(documentQuery: Filter<ScheduledJob> = {}) {
        return await this._dataProvider.find(documentQuery).toArray();
    }

    async get(scheduledJobId: ObjectId) {
        return await this._dataProvider.findOne({_id: scheduledJobId});
    }

    async create(newScheduledJob: ScheduledJob) {
        newScheduledJob = transformCronTimeIfNeeded(newScheduledJob);
        const result = await this._dataProvider.insertOne(newScheduledJob);
        if (result) {
            this.setCron({...newScheduledJob, _id: new ObjectId(result.insertedId)});
        }
        return result;
    }

    async update(updatedScheduledJob: ScheduledJob) {
        updatedScheduledJob = transformCronTimeIfNeeded(updatedScheduledJob);
        const query = {_id: updatedScheduledJob._id};
        const result = await this._dataProvider.updateOne(query, {$set: updatedScheduledJob});
        if (result) {
            this.setCron(updatedScheduledJob);
        }
        return result;
    }

    async delete(scheduledJobId: ObjectId) {
        const result = await this._dataProvider.deleteOne({_id: scheduledJobId});
        if (result && result.deletedCount) {
            this.deleteCron(scheduledJobId.toString());
        }
        return result;
    }

    dispatchImmediate(newScheduledJob: ScheduledJob) {
        JOB_TYPE_TO_ACTION.get(newScheduledJob.jobType)(newScheduledJob.jobParams);
    }


    private setCron(scheduledJob: Partial<ScheduledJob>) {
        const scheduledJobId = scheduledJob._id.toString();
        const existingJob = this._scheduledJobs.get(scheduledJobId);
        existingJob?.stop();
        const newCronJob = new CronJob(scheduledJob.cronTime, () => {
            JOB_TYPE_TO_ACTION.get(scheduledJob.jobType)(scheduledJob.jobParams);
            this.deleteCronIfDue(newCronJob, scheduledJobId);
        }, null, true)
        this._scheduledJobs.set(scheduledJobId, newCronJob);
    }

    private deleteCronIfDue(newCronJob: CronJob, scheduledJobId: string) {
        try {
            newCronJob.nextDates();
        } catch (e) {
            this.deleteCron(scheduledJobId);
        }
    }

    private deleteCron(scheduledJobId: string) {
        const existingJob = this._scheduledJobs.get(scheduledJobId);
        existingJob?.stop();
        this._scheduledJobs.delete(scheduledJobId);
    }
}


const transformCronTimeIfNeeded = (scheduledJob: ScheduledJob) => {
    if (!scheduledJob.cronTime) {
        return scheduledJob;
    }

    const cronTime = (typeof scheduledJob.cronTime === "string" && Date.parse(scheduledJob.cronTime))
        ? new Date(scheduledJob.cronTime)
        : scheduledJob.cronTime;
    return {...scheduledJob, cronTime};
}

export const scheduledJobsService = new ScheduledJobsService();