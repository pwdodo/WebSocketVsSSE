const WebSocket = require('ws');

// WebSocket client
const ws = new WebSocket('ws://localhost:3000/test');

// Event: WebSocket connection established
ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

// Event: WebSocket message received
ws.on('message', (data) => {
  const row = JSON.parse(data);
  console.log('Received new data:', row);
});

// Event: WebSocket connection closed
ws.on('close', () => {
  console.log('WebSocket connection closed');
});
