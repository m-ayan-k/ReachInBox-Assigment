# Backend Task

## Description
This Node.js project allows users to log in to their Gmail and Outlook accounts using OAuth2, granting access to read and write permissions. The application automatically replies to unread emails and categorizes them into three categories: Interested, Not Interested, and More Information, using OpenAI's API.


1. Clone the repository:

   ```bash
   git clone https://github.com/m-ayan-k/ReachInBox-Assigment.git
   cd your-repo-name

2. Install dependencies:

   ```bash
   npm install
   
3. Set up environment variables:
   #### Create a .env file in the root directory and add the following:
    ```bash
    OPENAI_API_KEY=your_openai_api_key
    CLIENT_ID=your_outlook_client_id
    CLIENT_SECRET=your_outlook_client_secret
    TENANT_ID=your_tentant_id
    REDIRECT_URI=your_outlook_redirect_uri

  For google OAuth credentials download the json file and save in root directory as credentials.json

4. Run the application:
   ```bash
   npm install
