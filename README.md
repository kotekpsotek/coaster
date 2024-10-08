# **Coaster project**
Allows to create and manage coatser

## ***How this works?***

### REST Endpoints
1. Register new coaster -  POST /api/coasters [REST]
2. Register new coaster wagon - POST /api/coasters/:coasterId/wagons [REST]
3. Delete coaster wagon - DELETE /api/coasters/:coasterId/wagons/:wagonId [REST]
4. Change coaster configuration data -  PUT /api/coasters/:coasterId


## Configuration
Configure project in [app.config.json](./app.config.json) file. Description: 

<br/>

- **mode** - takes one of two possible run-modes: ***developement*** or ***production***
- **port** - contains ports specification for both modes, either ***developement*** and ***production***
**redisUrl** - Connection to your redis database instance. Like: ***redis://localhost:6379***

## File structure description
```
src - folder with all files build app
logs - folder with all logs
 |   production - contains production log files
 |   developement - contains developement log files
test - contains unit tests of app
types - global types defintion for typescript project suite
app.config.json - configuration file
```

## Technologies
* Node.js
* Express.js
* TypeScript
* Vitest
* Redis
* Rust
