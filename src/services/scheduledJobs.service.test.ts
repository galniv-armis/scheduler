import {instance, mock, when, anything} from 'ts-mockito';
import {Collection, FindCursor, ObjectId} from 'mongodb';

import {JobType, ScheduledJob} from "../models/scheduledJob";
import {scheduledJobsService} from "./scheduledJobs.service";
import {CronJob} from "cron";

const mockedScheduledJobCollection: Collection<ScheduledJob> = mock(Collection<ScheduledJob>);
const mockedFindCursor: FindCursor<ScheduledJob> = mock(FindCursor<ScheduledJob>);


const SCHEDULED_JOBS = new Map<string, ScheduledJob>([
    [
        'SEND_EMAIL_IMMEDIATELY',
        {
            title: 'Send Manu an Email',
            description: 'Send an email to Manu immediately.',
            jobType: JobType.Email,
            jobParams: {to: 'manu@....', content: 'An email.'},
            _id: new ObjectId()
        }
    ],
    [
        'MAKE_COFFEE_EVERY_SECOND',
        {
            title: 'Make Coffee Every Second',
            description: 'Make coffee with 2 spoons of sugar every second!',
            jobType: JobType.MakeCoffee,
            jobParams: {sugar: 2},
            cron: '* * * * * *',
            _id: new ObjectId()
        }
    ]
])

// I usually don't like making my tests time dependant, this could be flakey & it's goofy to make tests run slow cause they wait.
// In Python I use freezgun for these kinds of things, but as I didn't find a good quick alternative in Node I used this (kinda cool) wait function I found online.
const waitFor = (time: number) => new Promise(resolve => setTimeout(resolve, time));


describe('Test suite for scheduledJobs.service.', () => {

    beforeAll(() => {
        when(mockedScheduledJobCollection.insertOne(anything())).thenCall((scheduledJob: ScheduledJob) => new Promise((resolve) => resolve({insertedId: scheduledJob._id})));
        when(mockedScheduledJobCollection.deleteOne(anything())).thenReturn(
            new Promise((resolve) => resolve({acknowledged: true, deletedCount: 1}))
        );
    })

    beforeEach(() => {
        console.log = jest.fn();
    })

    afterEach(() => {
        scheduledJobsService._scheduledJobs.forEach((job) => job.stop())
        scheduledJobsService._scheduledJobs = new Map<string, CronJob>();
    })

    describe("Test the service's setup functionality.", () => {

        beforeEach(() => {
            when(mockedFindCursor.toArray()).thenReturn(new Promise((resolve) => resolve([...SCHEDULED_JOBS.values()])))
            when(mockedScheduledJobCollection.find(anything())).thenReturn(instance(mockedFindCursor));
        })

        it('Should retrieve all non-immediate scheduled jobs from the data provider.', async () => {
            await scheduledJobsService.setup(instance(mockedScheduledJobCollection));

            expect(scheduledJobsService._scheduledJobs.has(SCHEDULED_JOBS.get('SEND_EMAIL_IMMEDIATELY')._id.toString())).toBe(false)
            expect(scheduledJobsService._scheduledJobs.has(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id.toString())).toBe(true)
        })

        it('Should run non-immediate scheduled jobs.', async () => {
            await scheduledJobsService.setup(instance(mockedScheduledJobCollection));
            await waitFor(1000)

            // If the jobs were real I would have mocked them too & used ts-mockito verify func to make sure they were called.
            expect(console.log).toHaveBeenCalledWith(`Making coffee with config ${JSON.stringify(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND').jobParams)}`);
        })
    })

    describe("Tests that start the service with empty setup.", () => {
        beforeAll(async () => {
            when(mockedFindCursor.toArray()).thenReturn(new Promise((resolve) => resolve([])))
            when(mockedScheduledJobCollection.find(anything())).thenReturn(instance(mockedFindCursor));
            await scheduledJobsService.setup(instance(mockedScheduledJobCollection));

        })

        describe("Test the service's create functionality.", () => {
            it('Should run immediate scheduled jobs immediately & not keep CronJobs for them.', async () => {
                await scheduledJobsService.create(SCHEDULED_JOBS.get('SEND_EMAIL_IMMEDIATELY'))
                expect(console.log).toHaveBeenCalledWith(`Sending email with config  ${JSON.stringify(SCHEDULED_JOBS.get('SEND_EMAIL_IMMEDIATELY').jobParams)}`);
            })

            it('Should run non-immediate scheduled jobs.', async () => {
                await scheduledJobsService.create(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND'))

                expect(scheduledJobsService._scheduledJobs.has(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id.toString())).toBe(true)

                await waitFor(2000)
                expect(console.log).toHaveBeenCalledWith(`Making coffee with config ${JSON.stringify(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND').jobParams)}`);
                expect(console.log).toHaveBeenCalledTimes(2);
            })
        })


        describe("Test the service's delete functionality.", () => {
            it('Should delete scheduled jobs from the CronJobs.', async () => {
                await scheduledJobsService.create(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND'))

                expect(scheduledJobsService._scheduledJobs.has(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id.toString())).toBe(true)

                await scheduledJobsService.delete(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id)
                expect(scheduledJobsService._scheduledJobs.has(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id.toString())).toBe(false)

            })

            it('Should stop the CronJob from recurring', async () => {
                await scheduledJobsService.create(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND'))
                await scheduledJobsService.delete(SCHEDULED_JOBS.get('MAKE_COFFEE_EVERY_SECOND')._id)
                console.log = jest.fn(); // To make sure we don't count logs from before the deletion.

                await waitFor(1000)
                expect(console.log).toHaveBeenCalledTimes(0);
            })
        })
    })
});