# Radium Budget Tracker
![MongoDb] ![express]

## Description

This budget tracker app allows you to record your expenses and income while online or offline! It is a progressive web app (PWA) and you can install it on your cell phone, to your home screen, or on your desktop or laptop!

![screenshot]

## Installation

*Note: requires that you have MongoDB server installed on the local machine.*

Download the project, install dependencies:

```sh
git clone https://github.com/chrispobrien/19-budget-radium.git
cd 19-budget-radium
npm i
```

## Configuration

In server.js, line 7, change the path to MongoDB if desired, and on line 6, change the port.

## Usage

Simply start the server:

```sh
npm start
```

## Credits

Most of this app was supplied by Columbia Engineering Coding Bootcamp/Trilogy.  The homework challenge was to add /public/idb.js, /manifest.json and /service-worker.js

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[mongoDB]: https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white
[express]: https://img.shields.io/badge/Express.js-404D59?style=for-the-badge
[License: MIT]: https://img.shields.io/badge/License-MIT-yellow.svg
[screenshot]: public/images/screenshot.png