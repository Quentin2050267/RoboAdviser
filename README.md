# RoboAdviser

This project is a web application built with Flask for the backend and React for the frontend. The application allows users to complete a survey and receive a report based on their answers.

## Prerequisites

- Python 3.x
- Node.js and npm

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/Quentin2050267/RoboAdviser.git
    cd RoboAdviser
    ```

2. **Set up the backend:**

    ```bash
    pip install -r requirements.txt
    python app.py
    ```

3. **Set up the frontend:**

    ```bash
    cd ./frontend
    npm install
    npm run build
    ```

4. **Access the application:**

    Open your web browser and go to `http://127.0.0.1:5000`.

## Deployment to Heroku

To deploy this application, we use services from Heroku. 
Follow these steps to deploy the application to Heroku:

### Prerequisites

- A [Heroku](https://www.heroku.com/) account
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git installed on your system

### Steps

1. **Log in to Heroku:**

    Open a terminal and log in to your Heroku account:

    ```bash
    heroku login
    ```

2. **Create a Heroku app:**

    Navigate to the root directory of your project and create a new Heroku app:

    ```bash
    heroku create
    ```

    This will create a new Heroku app and provide a URL for your application.

3. **Set up a `Procfile`:**

    Create a `Procfile` in the root directory of your project to specify how to run your application.

    ```plaintext
    web: python app.py
    ```

4. **Add a `requirements.txt` file (if not already present):**

    Ensure your backend dependencies are listed in a `requirements.txt` file. 

5. **Configure the frontend build:**

    Ensure your frontend is built and ready for deployment. Run the following commands:

    ```bash
    cd ./frontend
    npm run build
    cd ..
    ```

6. **Commit your changes:**

    Add and commit all changes to your Git repository:

    ```bash
    git add .
    git commit -m "Prepare for Heroku deployment"
    ```

7. **Deploy to Heroku:**

    Push your code to Heroku:

    ```bash
    git push heroku main
    ```

8.  **Open your application:**

    Once the deployment is complete, open your application in a browser:

    ```bash
    heroku open
    ```

### Additional Notes

- If you encounter issues, check the Heroku logs for debugging:

    ```bash
    heroku logs --tail
    ```

- If no web processes running:
    ```bash
    heroku ps:scale web=1
    ```

- If you want to shut down the service to avoid possible charging fee:
    ```bash
    heroku ps:scale web=0  
    ```

- **Remember to put the URL to the overleaf report.**

Your application should now be live on Heroku!