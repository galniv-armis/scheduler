import express, {Request, Response} from "express";
import {ObjectId} from "mongodb";

import {scheduledJobsService} from "../services/scheduledJobs.service";


export const scheduledJobsRouter = express.Router();


scheduledJobsRouter.use(express.json());

scheduledJobsRouter.get("/", async (_req: Request, res: Response) => {
    try {
        const scheduledJobs = await scheduledJobsService.getAllAsArray();

        res.status(200).send(scheduledJobs);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

scheduledJobsRouter.get("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const scheduledJob = await scheduledJobsService.get(new ObjectId(id));

        if (scheduledJob) {
            res.status(200).send(scheduledJob);
        }
    } catch (error) {
        res.status(404).send(`Unable to find matching document with id: '${req.params.id}'.`);
    }
});

scheduledJobsRouter.post("/", async (req: Request, res: Response) => {
    try {
        const newScheduledJob = req.body;
        if (newScheduledJob.cronTime === undefined) {
            scheduledJobsService.dispatchImmediate(newScheduledJob)
            res.status(200).send('The requested job was dispatched successfully.')
            return;
        }

        const result = await scheduledJobsService.create(newScheduledJob);
        result
            ? res.status(201).send(`Successfully created a new scheduledJob with id '${result.insertedId}'.`)
            : res.status(500).send("Failed to create a new scheduledJob.");
    } catch (error) {
        console.error(error);
        console.error(JSON.stringify(error.errInfo));
        res.status(400).send(error.message);
    }
});

scheduledJobsRouter.put("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const result = await scheduledJobsService.update({...req.body, id: new ObjectId(id)});

        result
            ? res.status(200).send(`Successfully updated scheduledJob with id '${id}'.`)
            : res.status(304).send(`ScheduledJob with id: ${id} not updated.`);
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
});

scheduledJobsRouter.delete("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const result = await scheduledJobsService.delete(new ObjectId(id));

        if (result && result.deletedCount) {
            res.status(202).send(`Successfully removed scheduledJob with id ${id}.`);
        } else if (!result) {
            res.status(400).send(`Failed to remove scheduledJob with id ${id}.`);
        } else if (!result.deletedCount) {
            res.status(404).send(`ScheduledJob with id ${id} does not exist.`);
        }
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
});
