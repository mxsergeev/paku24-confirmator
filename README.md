# paku24-confirmator

Internal tool for order management in Paku24.

## Development environment setup

### Shared prerequisites

1. Install [Docker](https://docs.docker.com/desktop/)

2. Clone the repository

   ```bash
   git clone https://github.com/mxsergeev/paku24-confirmator.git
   cd paku24-confirmator
   
   # Create and populate `.env` file
   cp .env.example .env
   ```

### Option A: Dev Container (VS Code)

- Install [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VS Code extension.

- Open the project in VS Code

- Enter the Dev Container: Press `CTRL/CMD + Shift + P` and then type `Dev Containers: Reopen in Container`.

- Once inside the container, run `yarn dev`

### Option B: Make (Terminal)

- Run `make dev`

- See `Makefile` for more commands (e.g., `make test`, `make stop`, `make clean`).


### Continue

3. Open the app at `http://localhost:3031`

   Login with username: `admin` and password: `1234`.

### End-to-end tests

Install Playwright's Chromium browser once on the host machine, then run the
dedicated E2E stack:

```bash
make test-e2e-install
make test-e2e
```

> If you can't login, the containers may not have initialized properly. Stop and remove volumes, then repeat the setup:
>
> **Make:** `make clean`
>
> **Dev Container:** Reopen the folder locally first (`CTRL/CMD + Shift + P` → `Dev Containers: Reopen Folder Locally`), then run:
> ```bash
> cd .devcontainer && docker compose down -v
> ```
> Then re-enter the container.

## Optional steps

The application will start with the default values from the `.env.example` file, but for full functionality (SMS Gateway, AWS SES, Google Calendar), additional data is needed.

Populate missing environment variables in the `.env` file.

```
 # SMS gateway credentials
 SEMYSMS_API_TOKEN=
 SEMYSMS_DEVICE_ID=

 # AWS credentials
 AWS_ACCESS_KEY_ID=
 AWS_SECRET_ACCESS_KEY=

 # AWS SES
 SOURCE_EMAIL=
```

#### SMS Gateway

Install [SemySMS Gateway app](https://semysms.net/app.php) on a phone (only available on Android).

Check the phone ID in the app and add it to `.env` file as `SEMYSMS_DEVICE_ID`.

Get `SEMYSMS_API_TOKEN` from the [SemySMS](https://semysms.net/) API settings.

#### Google Calendar

For Google Calendar integration to work, you need to create a service account in Google Cloud Console, enable Google Calendar API for it, and generate a JSON key file.

1.  In the Google Cloud console, go to **Menu** > **APIs & Services** > [**Credentials**](https://console.cloud.google.com/apis/credentials).
2.  Click **Create Credentials** > **OAuth client ID**.
3.  Click **Application type** > **Desktop app**.
4.  In the **Name** field, type a name for the credential. This name is only shown in the Google Cloud console.
5.  Click **Create**. The OAuth client created screen appears, showing your new Client ID and Client secret.
6.  Click **OK**. The newly created credential appears under **OAuth 2.0 Client IDs**.
7.  Save the downloaded JSON file as `${NODE_ENV}.calendar.google.credentials.json`, and move the file to `credentials/`.

    After that run the following command:

    ```bash
    NODE_ENV=production/development node backend/modules/calendar/authorize.js
    ```

## Production deployment

1. Install [Docker](https://docs.docker.com/desktop/)

2. Clone the repository

   ```bash
   git clone https://github.com/mxsergeev/paku24-confirmator.git
   cd paku24-confirmator

   # Create and populate `.env` file
   cp .env.example .env
   ```

3. Change the `.env` file with meaningful values for production environment.

4. Build and start the containers

   ```bash
   docker compose up -d --build
   ```
