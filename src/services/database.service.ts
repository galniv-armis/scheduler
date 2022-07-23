import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import {JobType, ScheduledJob} from "../models/scheduledJob";

export const collections: { scheduledJobs?: mongoDB.Collection<ScheduledJob> } = {};

export async function connectToDatabase() {
    // Pulls in the config from .env file.
    dotenv.config();

    const client = new mongoDB.MongoClient(process.env.DB_CONN_STRING);
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    await applySchemaValidation(db);

    // Persist the connection to the scheduledJobCollection collection.
    const scheduledJobCollection = db.collection<ScheduledJob>(process.env.SCHEDCHULED_JOBS_COLLECTION_NAME);
    collections.scheduledJobs = scheduledJobCollection;

    console.log(
        `Successfully connected to database: ${db.databaseName} and collection: ${scheduledJobCollection.collectionName}`,
    );
}

// Update our existing collection with JSON schema validation so we know our documents will always match the shape of our ScheduledJob model, even if added elsewhere.
// For more information about schema validation, see this blog series: https://www.mongodb.com/blog/post/json-schema-validation--locking-down-your-model-the-smart-way
async function applySchemaValidation(db: mongoDB.Db) {
    const jsonSchema = {
        $jsonSchema: {
            bsonType: "object",
            required: ["title", "description", "jobType", "cronTime"],
            additionalProperties: false,
            properties: {
                _id: {},
                title: {
                    bsonType: "string",
                    description: "'title' is required and is a string",
                },
                description: {
                    bsonType: "string",
                    description: "'description' is required and is a string",
                },
                jobType: {
                    enum: Object.values(JobType),
                    description: "'jobType' is required and it's an enum",
                },
                // currently mongoDB doesn't support "or" here so I've omitted type here'.
                // the validation can improve by using a different validator below.
                cronTime: {
                    description: "'cronTime' is required and it's a valid cronTime string or Date",
                },
                jobParams: {
                    bsonType: "object",
                    description: "'jobParams' is not required, it an object to add config for the specific action.",
                },
            },
        },
    };

    await db.command({
        collMod: process.env.SCHEDCHULED_JOBS_COLLECTION_NAME,
        validator: jsonSchema
    }).catch(async (error: mongoDB.MongoServerError) => {
            if (error.codeName === 'NamespaceNotFound') {
                await db.createCollection(process.env.SCHEDCHULED_JOBS_COLLECTION_NAME, {validator: jsonSchema});
                return;
            }
            console.error("Didn't apply schema validation!")
            console.error(error);
        }
    );
}
