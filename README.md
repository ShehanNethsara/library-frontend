# Library Frontend - Library Management System

**Student Name:** Shehan Nethsara

**Student Number:** 241711008

**GCP Project ID:** alpha-motion-5f0b0

## Project Description

This repository contains the React frontend for the Library Management System. It provides a Single Page Application (SPA) for managing books, users, and donations, communicating with the backend microservices through the API Gateway.

**Live URL:** https://library-frontend-1075532231715.us-central1.run.app

## Technology Stack

- React 19
- Vite
- Axios
- Docker (Nginx-based multi-stage build)
- Google Cloud Run (PaaS / Serverless)

## Setup / Getting Started

1. Clone this repository:

`git clone https://github.com/ShehanNethsara/library-frontend.git`

2. Install dependencies:

`npm install`

3. Run in development mode:

`npm run dev`

4. Build for production:

`npm run build`

5. The production build is served via Nginx inside a Docker container and deployed to Google Cloud Run:

`gcloud run deploy library-frontend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080`

## Related Repositories

- [microservices-platform](https://github.com/ShehanNethsara/microservices-platform) — Config Server, Eureka Server, API Gateway
- [microservices-services](https://github.com/ShehanNethsara/microservices-services) — Business logic services (User, Book, Donate)
