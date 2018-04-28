var width = window.innerWidth-10,
  height = window.innerHeight-10;

//document.getElementById('map').style.width = width + 'px';
//document.getElementById('map').style.height = height + 'px';
//document.getElementById('menu').style.left = width - 150 + 'px';

document.getElementById('speciesInput').addEventListener('change', function() {
  changeSpecies(this.value);
});

//map layers
var land = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', { id: 'mapbox.streets' });
var lakeContours = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/lakefinder@mn_google/{z}/{x}/{y}.png');
//var satellite = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/img_fsa15aim4@mn_google/{z}/{x}/{y}.png');
//var compass = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/compass@mn_google/{z}/{x}/{y}.png');

//map settings
var map = L.map('map', {
    center: [46.3924658,-93.5],
    zoom: 6,
    maxZoom: 20,
    minZoom: 4,
    zoomControl: false,
    layers: [land, lakeContours],
    maxBounds:([
        [20, -135],
        [60, -55]
    ])
});

//cluster settings
var clusters = L.markerClusterGroup({
  showCoverageOnHover: false
});

map.addLayer(clusters);

var lakeMarkers,
  speciesLayerShown = false;

function changeSpecies(species) {
  if(speciesLayerShown) {
    clusters.removeLayer(lakeMarkers);
  }

  lakeMarkers = L.geoJson(allLakes,{
    pointToLayer: function(feature,LatLng){
      var marker = L.marker(LatLng);
      marker.bindTooltip(feature.properties.name);

      for(var i=0; i<feature.properties.fishSpecies.length; i++) {
        if(feature.properties.fishSpecies[i] === species) {
          return marker;
        } else if (species == "bullhead") {
          if (feature.properties.fishSpecies[i] === ("black bullhead" || "brown bullhead" || "yellow bullhead")) {
            return marker;
          }
        } else if (species == "sunfish") {
          if (feature.properties.fishSpecies[i] === ("hybrid sunfish" || "green sunfish" || "pumpkinseed" || "bluegill" || "sunfish")) {
            return marker;
          }
        }else if (species == "crappie") {
          if (feature.properties.fishSpecies[i] === ("black crappie" || "white crappie")) {
            return marker;
          }
        } else if (species == "carp") {
          if (feature.properties.fishSpecies[i] === ("white sucker" || "common carp" || "bigmouth buffalo" || "shorthead redhorse" || "silver redhorse" || "golden redhorse" || "greater redhorse")) {
            return marker;
          }
        } else if (species === "all lakes") {
          return marker;
        }
      }
    }
  });
  clusters.addLayer(lakeMarkers);
  speciesLayerShown = true;
}
