import express from "express";
import {connectToDatabase} from "./services/database.service";
import {scheduledJobsRouter} from "./routes/scheduledJobs.router";
import {collections} from "./services/database.service";
import {scheduledJobsService} from "./services/scheduledJobs.service";

const app = express();
const port = process.env.PORT || 80

connectToDatabase()
    .then(() => {
        scheduledJobsService.setup(collections.scheduledJobs)
            .then(() => {
                    app.use("/scheduled-jobs", scheduledJobsRouter);
                    app.listen(port, () => console.log(`Server started at http://localhost:${port}`));
                }
            )
    })
    .catch((error: Error) => {
        console.error("Database connection failed", error);
        process.exit();
    });
