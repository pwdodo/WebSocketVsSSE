const EventSource = require("eventsource");

const eventSource = new EventSource('http://localhost:3000/events');

eventSource.addEventListener('message', (event) => {
  const eventData = JSON.parse(event.data);
  console.log('Received event:', eventData);
});

eventSource.addEventListener('open', () => {
  console.log('Connection to SSE server opened');
});

eventSource.addEventListener('error', (error) => {
  console.error('Error connecting to SSE server:', error);
});
