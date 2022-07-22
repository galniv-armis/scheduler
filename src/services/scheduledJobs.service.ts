import {CronJob} from 'cron';
import {Collection, ObjectId} from "mongodb";

import {ScheduledJob, JobType} from "../models/scheduledJob";

type DataProvider = Collection<ScheduledJob> // | more types

const JOB_TYPE_TO_ACTION = new Map<JobType, (scheduledJobParams: object) => void>([
    [JobType.Email, (scheduledJobParams: object) => console.log(`Sending email with config  ${scheduledJobParams}`)],
    [JobType.BuildProject, (scheduledJobParams: object) => console.log(`Building a project with config ${scheduledJobParams}`)],
    [JobType.MakeCoffee, (scheduledJobParams: object) => console.log(`Making coffee with config ${scheduledJobParams}`)],
    [JobType.BuyPlainTicket, (scheduledJobParams: object) => console.log(`Buying a plane ticket with config ${scheduledJobParams}`)],
])


class ScheduledJobsService {
    _scheduledJobs: Map<string, CronJob>;
    _dataProvider: DataProvider;

    constructor() {
        this._scheduledJobs = new Map<string, CronJob>();
    }

    async setup(dataProvider: DataProvider) {
        this._dataProvider = dataProvider
        const scheduledJobs = await this.getAllAsArray();
        scheduledJobs.forEach((scheduledJob: ScheduledJob) => this.setCron(scheduledJob, false))
    }

    async getAllAsArray() {
        return await this._dataProvider.find({}).toArray();
    }

    async get(scheduledJobId: ObjectId) {
        return await this._dataProvider.findOne({_id: scheduledJobId});
    }

    async create(newScheduledJob: ScheduledJob) {
        const result = await this._dataProvider.insertOne(newScheduledJob);
        if (result) {
            this.setCron({...newScheduledJob, _id: new ObjectId(result.insertedId)})
        }
        return result
    }

    async update(updatedScheduledJob: ScheduledJob) {
        const query = {_id: updatedScheduledJob._id}
        const result = await this._dataProvider.updateOne(query, {$set: updatedScheduledJob});
        if (result) {
            this.setCron(updatedScheduledJob)
        }
        return result
    }

    async delete(scheduledJobId: ObjectId) {
        const result = await this._dataProvider.deleteOne({_id: scheduledJobId});
        if (result && result.deletedCount) {
            this.deleteCron(scheduledJobId.toString())
        }
        return result
    }


    private setCron(scheduledJob: ScheduledJob, runImmediateJobs: boolean = true) {
        if (scheduledJob.cron === undefined) {
            if (runImmediateJobs) {
                JOB_TYPE_TO_ACTION.get(scheduledJob.jobType)(scheduledJob.jobParams);
            }
            return;
        }

        const scheduledJobId = scheduledJob._id.toString();
        const existingJob = this._scheduledJobs.get(scheduledJobId);
        existingJob?.stop()
        const newCronJob = new CronJob(scheduledJob.cron, () => {
            try {
                JOB_TYPE_TO_ACTION.get(scheduledJob.jobType)(scheduledJob.jobParams);
            } catch (e) {
                console.error(e);
            }
        }, null, true)
        this._scheduledJobs.set(scheduledJobId, newCronJob);
    }

    private deleteCron(scheduledJobId: string) {
        const existingJob = this._scheduledJobs.get(scheduledJobId);
        existingJob?.stop()
        this._scheduledJobs.delete(scheduledJobId);
    }

}

export const scheduledJobsService = new ScheduledJobsService();