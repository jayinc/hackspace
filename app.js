
'use strict';

// http://vanhack.ca/wp/events-calendar/

//process.env.DEBUG = 'actions-on-google:*';
var https = require('https');
var httpStatus = require('http-status-codes');
var ActionsSdkApp = require('actions-on-google').ActionsSdkApp;
var express = require('express');
var expressApp = express();
var bodyParser = require('body-parser');
var Callback = require('./callback');
var port = process.env.PORT || 8080;
var VHS_EVENTS_QUERY = 'Events Query';

function handlePost(request, response)
{
 var app, actions, parms;

 // Javascript assistant API

 parms = {};
 parms.request = request;
 parms.response = response;

 app = new ActionsSdkApp(parms);

 // Our intent to handler mapping

 actions = new Map();
 actions.set(VHS_EVENTS_QUERY,         queryIntent);
 actions.set(app.StandardIntents.MAIN, mainIntent);
 actions.set(app.StandardIntents.TEXT, textIntent);
 app.handleRequest(actions);

 // Handles the main intent - door is open?

 function mainIntent(app)
 {
  var cb;

  console.log('In main intent');

  cb = new Callback();
  cb.app = app;
  getFromVHS(cb);

  return cb.getPromise();
 }

 // Handles the query intent - next event is when?

 function queryIntent(app)
 {
  var card, response;

  console.log('In query intent');

  card = app.buildBasicCard();
  card.setTitle('Vancouver Hack Space')
      .setSubtitle('Upcoming Events')
      .setBodyText('-----------------')
      .addButton('View', 'http://vanhack.ca/wp/events-calendar/');

  response = app.buildRichResponse();
  response.addBasicCard(card)
          .addSimpleResponse('Here you go!');

  app.tell(response);
 }

 // Handles the text intent

 function textIntent(app)
 {
  var text;

  text = app.getRawInput() || '';
  app.ask(text);
 }
}

// Quick and dirty browser-based server health checker

function handleGet(request, response)
{
 var date;

 date = new Date();
 
 response.send('Vancouver Hack Space says hello on ' +
                 date.toLocaleDateString() +
                   ' at ' +
                     date.toLocaleTimeString());
}

// Sends a request to get the state of the door at Vancouver Hack Space

function getFromVHS(cb)
{
 cb.text = '';
 https.get('https://api.vanhack.ca/s/vhs/data/door.txt',
         cb.to(getFromVHSCompletes));
}

// Runs when the request to VHS has been sent

function getFromVHSCompletes(response, cb)
{
 response.on('data', function(chunk){ cb.text += chunk; });
 response.on('end',  function(){ gotVHSResponse(cb, response.statusCode); });
}

// Runs when the response from VHS has arrived in full

function gotVHSResponse(cb, code)
{
 var text;

 text = cb.text;

 if ( code == httpStatus.OK )
  cb.app.tell('Vancouver Hack Space is ' + text + '.');

 else
  cb.app.tell('Sorry, I don\'t know whether the Vancouver Hack Space is open or not.');

 cb.fulfill(text);
 cb = null;
}

// Start the web server

expressApp.set('port', port);
expressApp.use( bodyParser.json( {type: 'application/json'} ) );

// Handles POSTs from the Google Assistant

expressApp.post('/', handlePost);

// Handles GETs from a browser for checking for signs of life

expressApp.get('/', handleGet);

// Listen for connections

expressApp.listen(port);

// Show that we are ready to go

console.log('Vancouver Hack Space Assistant listening on port %s', port);

module.exports = expressApp;