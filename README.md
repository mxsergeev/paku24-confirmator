# Confirmator app

## Introduction

This application was developed for [Paku24](https://paku24.fi/) moving company, a family business, in late 2020 and early 2021 as my first serious project.

I continued its development in late 2022 and early 2023.

The app focuses on automating the process of accepting and confirming orders. It formats the order, sends a confirmation email and SMS, and adds the order to the schedule. It also provides some basic statistics on how many orders were accepted by month, week, and day.

## Technologies used

- Node, Express
- React, Material UI
- MongoDB, Mongoose
- AWS SES
- Google Calendar
- SemySMS Gateway

The app also uses an authentication pattern that features [rotating refresh tokens with short-lived access tokens](https://supertokens.com/blog/the-best-way-to-securely-manage-user-sessions).

## Setup

### `.env`

Create and populate the `.env` file in the root folder. Use [`.env.example`](.env.example) as a reference.

### Starting up

#### Production

```
docker compose up
```

#### Development

- Install [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VS Code extension.

- Start development environment. Press `CTRL + P` and then type `>Dev Containers: Reopen in Container`.

- Run `yarn dev`.

### MongoDB

The development environment includes a MongoDB container with a default admin user (`admin`/`password`) already created.

### Confirmator user

Login with `admin`/`1234` credentials.

### Google Calendar

This app adds events to the Google Calendar. You need to provide access to this app in order to do that.

> Please, read the source as it may contain an updated version of the guide: [Node.js quickstart guide](https://developers.google.com/calendar/api/quickstart/nodejs).

#### Enable the API

Before using Google APIs, you need to turn them on in a Google Cloud project. You can turn on one or more APIs in a single Google Cloud project.

- [In the Google Cloud console, enable the Google Calendar API](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com).

#### Authorize credentials for a desktop application

To authenticate as an end user and access user data in your app, you need to create one or more OAuth 2.0 Client IDs. A client ID is used to identify a single app to Google's OAuth servers. If your app runs on multiple platforms, you must create a separate client ID for each platform.

1. In the Google Cloud console, go to **Menu** > **APIs & Services** > [**Credentials**](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** > **OAuth client ID**.
3. Click **Application type** > **Desktop app**.
4. In the **Name** field, type a name for the credential. This name is only shown in the Google Cloud console.
5. Click **Create**. The OAuth client created screen appears, showing your new Client ID and Client secret.
6. Click **OK**. The newly created credential appears under **OAuth 2.0 Client IDs**.
7. Save the downloaded JSON file as `${NODE_ENV}.calendar.google.credentials.json`, and move the file to `credentials/`.

#### Create a token

Run a script, which will create the token needed for accessing Google APIs. You will need to log in or select the Google account to which you want to provide access.

Authorization information will be stored in the file system, so the next time you run the

For example:

```
NODE_ENV=development node backend/modules/calendar/authorize.js
```

NOTE: When trying to authorize the app in Firefox, you may get some obscure errors. Try Chromium in that case.

### SMS Gateway

This app sends SMS using the SemySMS Gateway. SMS Gateway is useful if you want to send SMS from your existing phone number, be able to view them on the phone, and receive replies.

#### Create account

Start by creating a [SemySMS account](semysms.net).

#### Install the gateway

Proceed by installing the [SemySMS Gateway app](https://semysms.net/app.php) on the phone from which you want to send SMS (only available on Android, a different method for iOS will be added later).

Open the app, check the phone ID, and add it to `.env` file as `SEMYSMS_DEVICE_ID`.

#### Check that everything works properly

Start the SemySMS Gateway service. Send a fake confirmation message to your own phone number from the paku24-confirmator app.

#### Purchase premium access

Upon registration, 3 days of Premium are provided for verification and testing, but after that, the app won't work. I recommend purchasing the "5 000 messages" package, which should be sufficient for a long time.

To get premium access, install the [SemySMS Pay app](https://play.google.com/store/apps/details?id=net.semysms.pay) and follow the instructions.

### AWS SES

This app sends emails using AWS SES. You need to have an AWS account and set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to the `.env` file. AWS SES offers 62,000 Outbound Messages per month to any recipient when you call Amazon SES from an Amazon EC2 instance directly.
