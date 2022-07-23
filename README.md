# Introduction
A simple scheduler service api server implemented in Typescript using Node.js & MongoDB.
The server implements a `REST api` for `CRUD` operations to `scheduled-jobs`.

You're welcome to use the deployed service available in: https://a-team-scheduler-api.herokuapp.com/

See documentation below for more details of how to use the api.

# Thought & Ideas For Future Development
## Features & Code Refactors
1. Add a UI to the service.
2. Support authentication of users & role based permissions.
3. Add a separate interface for Jobs & extend it in ScheduledJobs (as I later realized the immediate jobs don't really belong to this type).

## Testing & CI
1. Improve the unit tests to not really wait for crons to fire.
2. Add integration tests.

## Scale
In case the amount of data is too large to fit in memory the service supports raising more instances, each instance can manage a subset of the data using its data provider.

Another approach could be to only save ids & crons for a job & delegate the job execution to another serve. 


# API documentation
```
/scheduled-jobs
GET - gets all scheduled jobs.
POST - Add a scheduled job the schema for a job is:
        {
            title: string,
            description: string,
            jobType: oneOf("MAKE_COFFEE", "EMAIL", "BUY_PLANE_TICKET", "BUILD_PROJECT")
            cronTime: A valid cron string or a date javascript can parse using its built-in Date object.
          
            // not required
            jobParams: object - config for the specific job
        }

/scheduled-jobs/id
GET - Gets the scheudled job with the given id.
PUT - Updates the scheduled job with the given id if exists using a partial (or full) scheduled job from the schema above.
DELETE - Deltes the scheduled job with the given id 

All API endpoints status codes adhere the conventions for REST api.
```

## Examples For Scheduled Jobs
```
// Runs every second
{
    "title": "Make Coffee Every Second",
    "description": "Make coffee with 2 spoons of sugar every second!",
    "jobType": "MAKE_COFFEE",
    "jobParams": {"sugar": 2},
    "cronTime": "* * * * * *"
}

// Runs on 17/12/2023
{
    "title": "Buy a ticket to Taiwan",
    "description": "But me a ticket using my credit card.",
    "jobType": "BUY_PLANE_TICKET",
    "jobParams": {"creditCardInfo": "maybe not a good idea to include here"}
}

// Immediate 
{
    "title": "Send Joe an Email",
    "description": "Send an email to Joe immediately.",
    "jobType": "EMAIL",
    "jobParams": {"to": "joe@....", "content": "An email."}
    
}


```

# Running Locally

# Installation & Configuration
1. Create a `.env` file in the root of the project with the properties I've provided separately.
2. Run `npm i` to install all dependencies listed in `package.json`.

# Run Dev Server 
`npm run dev`

# Run Tests
`npm test` 
