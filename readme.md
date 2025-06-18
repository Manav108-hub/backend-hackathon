📦 Retail Supply Chain Backend
==============================

This repository hosts the backend services for a real-time retail supply chain management system. It provides APIs for managing inventory, tracking deliveries, analyzing sales data, and simulating supply chain events, designed to power a responsive administrative dashboard.

✨ Features
----------

*   **Admin Authentication**: Secure registration and login for administrative users with JWT-based authentication.
    
*   **Inventory Management**: Real-time tracking and fetching of product stock levels.
    
*   **Delivery Tracking**: Monitor and retrieve the live status and location of delivery vehicles.
    
*   **Sales Analytics**: Access sales data, enabling insights into trends and performance over custom date ranges.
    
*   **Order Management**: API to create new orders (primarily for simulation purposes in this backend).
    
*   **Data Simulation**: Endpoints to start real-time inventory and delivery simulations, as well as to seed initial sample data into the database.
    
*   **Firebase Integration**: Leverages Firestore for data storage and Firebase Cloud Functions for scheduled background tasks (simulations).
    
*   **Global Error Handling**: Robust error handling for a stable API.
    

🚀 Technologies Used
--------------------

*   **Node.js**: JavaScript runtime environment.
    
*   **Express.js**: Fast, unopinionated, minimalist web framework for Node.js.
    
*   **TypeScript**: Superset of JavaScript that adds static types.
    
*   **Firebase Admin SDK**: For interacting with Firebase services (Firestore, Auth).
    
*   **Firebase Firestore**: NoSQL cloud database for storing application data.
    
*   **Firebase Cloud Functions**: Serverless environment for running backend code in response to events or schedules (used for autonomous simulations).
    
*   **JSON Web Tokens (JWT)**: For secure authentication and authorization.
    
*   **Bcrypt.js**: For hashing and salting passwords securely.
    
*   **cors**: Middleware for enabling Cross-Origin Resource Sharing.
    
*   **dotenv**: For loading environment variables from a .env file.
    
*   **nodemon**: For automatic server restarts during development.
    


⚙️ Getting Started
------------------

Follow these steps to set up and run the backend locally.

### Prerequisites

*   Node.js (v18 or higher recommended)
    
*   npm (usually comes with Node.js)
    
*   Firebase CLI: npm install -g firebase-tools
    

### Installation

1.  git clone https://github.com/your-username/retail-supply-chain-backend.gitcd retail-supply-chain-backend
    
2.  npm install
    
3.  firebase init functions
    
    *   Follow the prompts. Choose TypeScript when asked.
        
    *   Make sure to select functions as the directory.
        
4.  cd functionsnpm installcd .. # Go back to the root backend directory
    

### Environment Variables

Create a .env file in the root backend/ directory and populate it with your Firebase project credentials. You can obtain these from your Firebase Project Settings -> Service Accounts.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   PORT=3001  JWT_SECRET=your_super_secret_jwt_key_here # IMPORTANT: Use a strong, unique key  FIREBASE_PROJECT_ID=your-project-id  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"  FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com   `

**Note:** The FIREBASE\_PRIVATE\_KEY needs to have \\n replaced with actual newlines if you copy it directly from the Firebase console's JSON. The replace(/\\\\n/g, '\\n') in src/config/firebase.ts handles this for you.

### Firebase Project Setup

1.  Go to your Firebase Console: [console.firebase.google.com](https://console.firebase.google.com/)
    
2.  Create a new project or select an existing one.
    
3.  Enable **Firestore Database** in your project.
    
4.  Navigate to **Project settings** (gear icon) > **Service accounts**.
    
5.  Generate a new private key. This will download a JSON file.
    
6.  Copy the project\_id, private\_key, and client\_email from this JSON file into your .env file as shown above.
    

💻 Available Scripts
--------------------

These scripts are defined in package.json for the main backend application:

*   npm run dev: Starts the backend server in development mode using nodemon for automatic restarts on code changes.
    
*   npm run build: Compiles TypeScript source files from src/ to JavaScript in the dist/ directory.
    
*   npm run start: Starts the compiled Node.js server from the dist/ directory.
    
*   npm run deploy: Deploys your Firebase Cloud Functions to Firebase. (Run this from the root backend/ directory; it will navigate into functions/ automatically).
    

⚡ API Endpoints
---------------

All API endpoints are prefixed with /api.

Method

Path

Description

Authentication Required

POST

/api/register

Register a new admin user.

No

POST

/api/login

Log in an admin user and get a JWT.

No

GET

/api/health

Check the server health.

No

GET

/api/inventory

Retrieve current inventory updates.

Yes (Admin)

GET

/api/delivery/:orderId?

Get all delivery statuses or for a specific order.

Yes (Admin)

GET

/api/analytics/sales?days=7

Get sales data for the last N days (default 7).

Yes (Admin)

POST

/api/orders

Create a new order (primarily for simulation).

Yes (Admin)

POST

/api/simulation/start

Start real-time inventory and delivery simulations.

Yes (Admin)

POST

/api/simulation/seed

Generate initial sample inventory and sales data.

Yes (Admin)

### Authentication

Most API endpoints are protected using JWT (JSON Web Token) authentication. To access these endpoints, you must:

1.  Call the /api/login endpoint with valid admin credentials to receive a token.
    
2.  Include this token in the Authorization header of subsequent requests in the format: Bearer YOUR\_JWT\_TOKEN.
    

Example curl for a protected endpoint:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   # First, get a token (assuming you have a registered admin)  # curl -X POST -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "password123"}' http://localhost:3001/api/login  # Then use the token (replace YOUR_JWT_TOKEN with the actual token)  curl -X GET -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/inventory   `

📊 Simulations & Seeding
------------------------

The backend includes powerful simulation capabilities for testing and demonstration:

*   **POST /api/simulation/seed**: Use this endpoint once to populate your Firestore with some initial sample inventory\_updates and sales\_data.
    
*   **POST /api/simulation/start**: This endpoint initiates recurring background tasks within your Node.js application (using setInterval) to continuously generate and update inventory levels and delivery statuses. These updates will directly populate your Firestore collections, providing real-time data for your frontend.
    

### Firebase Cloud Functions for Simulations

In addition to the Express-based simulations, functions/src/index.ts contains Firebase Cloud Functions for inventorySimulation and deliverySimulation. These functions are scheduled to run periodically on Firebase's infrastructure, providing an alternative, serverless way to keep your data fresh without the need for your Node.js Express server to be constantly running the setInterval loops.

To deploy these functions:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   npm run deploy # Run from the backend/ root directory   `

🐛 Error Handling
-----------------

The backend implements global error handling middleware to catch unhandled exceptions and return consistent JSON error responses, preventing server crashes.

🤝 Frontend Development
-----------------------

This backend is designed to be consumed by a frontend application. A recommended frontend setup is detailed in the Frontend Development README section in the project brief, suggesting Next.js, Tailwind CSS, shadcn/ui, Chart.js/Recharts, and Mapbox GL JS for building a real-time dashboard. Real-time data can be fetched using direct Firestore SDK listeners on the frontend.