This is the backend/server-side code for my simple chat application. The repository for the frontend can be found [here](https://github.com/JHS96/simple-chat-frontend).

A working, live version of the frontend can be found at [Simplechat.online](https://simplechat.online).

## Technologies used to build this server:

1. [node.js](https://nodejs.org/en/)
2. [express.js](http://expressjs.com/)
3. [mongoose](https://mongoosejs.com/)
4. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
5. [jsonwebtoken](https://www.jsonwebtoken.io/)
6. [socket.io](https://socket.io/)
7. [multer](https://www.npmjs.com/package/multer)
8. [Sendgrid mail](https://www.npmjs.com/package/multer)
9. [aws-sdk](https://docs.aws.amazon.com/sdk-for-javascript/index.html)
10. [bcryptjs](https://www.npmjs.com/package/bcrypt)
11. [dotenv](https://www.npmjs.com/package/dotenv)
12. [express-validator](https://www.npmjs.com/package/express-validator)
13. [helmet](https://www.npmjs.com/package/helmet)
14. [pdfkit](https://www.npmjs.com/package/pdfkit)
15. [randomstring](https://www.npmjs.com/package/randomstring)
16. [nodemon](https://www.npmjs.com/package/nodemon)

Please refer to the package.json file to see specific versions of the above mentioned technologies/libraries/frameworks used in this project.

## In order to get this backend/sever-side code to work, do the following:

1. ### Run `npm install`

to install necessary dependencies.

2. ### Create a .env file

in the root directory of the project. (Make sure that the .env file is referenced in your .gitignore file.)

Your .env file must have the following information:

```
MONGODB_DEV='Connection string for your MongoDB Atlas DEVELOPMENT database'
MONGODB_PROD='Connection string for your MongoDB Atlas PRODUCTION database'

JWT_SECRET='Your jsonwebtoken secret string'

AWS_IAM_USER_KEY='Your AWS IAM user key'
AWS_IAM_USER_SECRET='Your AWS IAM user secret'
AWS_BUCKET_NAME='Your AWS bucket name used for this project'
AWS_REGION='The region you set up for your AWS account'
AWS_DEFAULT_AVATAR_URL='The AWS url of the default avatar image you are using'

SENDGRID_API_KEY='Your Sendgrid API key'
SENDGRID_FROM_ADDRESS='The "from" email address you have set up at Sendgrid'

FRONTEND_DOMAIN='The domain/address of your frontend application.'
```

### IMPORTANT

If you are going to deploy this server to [Heroku](https://www.heroku.com/) (as I have), make sure to add all the information in your .env file into your app's "Config Vars" in Heroku so that the platform can make use of thereof, otherwise the server will not work.
