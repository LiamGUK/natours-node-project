console.log('mapbox.js');

// Mapbox doesn't support WebGL2 rendering - Can't be used
// mapboxgl.accessToken =
//   'pk.eyJ1IjoibGlhbWd1ayIsImEiOiJjbTA2aml4eGswdG0xMnJyMGV3cmk1anB3In0.g7IrivlbEYahXGeT3jah4w';
// const map = new mapboxgl.Map({
//   container: 'map', // container ID
//   style: 'mapbox://styles/mapbox/streets-v12', // style URL
//   center: [-74.5, 40], // starting position [lng, lat]
//   zoom: 9, // starting zoom
// });

const locations = JSON.parse(document.getElementById('map').dataset.locations);
