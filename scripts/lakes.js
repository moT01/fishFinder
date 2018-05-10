//map layers
const terrain = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', { id: 'mapbox.streets' });
const lakeContours = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/lakefinder@mn_google/{z}/{x}/{y}.png');
//var satellite = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/img_fsa15aim4@mn_google/{z}/{x}/{y}.png');
//var compass = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/compass@mn_google/{z}/{x}/{y}.png');

//create map
let map = L.map('map', {
  center: [46.3924658,-93.5],
  zoom: 6,
  maxZoom: 20,
  minZoom: 4,
  zoomControl: false,
  layers: [terrain, lakeContours],
  maxBounds:([
    [20, -135],
    [60, -55]
  ])
});

//create clusters
let clusters = L.markerClusterGroup({
  showCoverageOnHover: false
});
map.addLayer(clusters);

//listener for change of species
document.getElementById('speciesInput').addEventListener('change', function() {
  changeSpecies(this.value);
});

//variables for changeSpecies()
let lakeMarkers,
  speciesLayerShown = false;

//this gets what lakes have the selected species and displays the markers
function changeSpecies(species) {
  if(speciesLayerShown) {
    clusters.removeLayer(lakeMarkers);
  }

  //create layer for lake markers
  lakeMarkers = L.geoJson(allLakes, {
    pointToLayer: function(feature, LatLng){
      let marker = L.marker(LatLng);
      marker.bindTooltip(feature.properties.name);
      marker.bindPopup(popup);
      marker.on('click', function() {
        getSurveyData(this.feature.properties, species);
      });

      //return a marker for any lake with selected species
      let fishSpecies = feature.properties.fishSpecies;
      for(let i=0; i<fishSpecies.length; i++) {
        if(fishSpecies[i] === species) {
          return marker;
        } else if (species === "bullhead") {
          if (fishSpecies[i] === ("black bullhead" || "brown bullhead" || "yellow bullhead")) {
            return marker;
          }
        } else if (species === "sunfish") {
          if (fishSpecies[i] === ("hybrid sunfish" || "green sunfish" || "pumpkinseed" || "bluegill" || "sunfish")) {
            return marker;
          }
        }else if (species === "crappie") {
          if (fishSpecies[i] === ("black crappie" || "white crappie")) {
            return marker;
          }
        } else if (species == "carp") {
          if (fishSpecies[i] === ("white sucker" || "common carp" || "bigmouth buffalo" || "shorthead redhorse" || "silver redhorse" || "golden redhorse" || "greater redhorse")) {
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

//create popup
let popup = L.popup({
  minWidth: 300,
  autoClose: false
});

//variables for getSurveyData()
let popupContent = '',
  surveyDates = [],
  sortedSurveys = [],
  sortedSummaries = [],
  summaryResults = {},
  summaryGearCount = 0,
  gearTypesUsed = [],
  cpueDataPoint,
  weightDataPoint,
  cpueDataset = [],
  weightDataset = [];

//this gets the lake data from the dnr and displays it
function getSurveyData(lakeProperties, species) {
  popupContent = ``;
  popupContent += `<div class="lakeName">${lakeProperties.name}</div>`;
  popupContent += `<table class="table">`;
  popupContent +=   `<tr><td class="detail">Acres         </td><td>:</td><td class="data">${lakeProperties.acres}               </td></tr>`;
  popupContent +=   `<tr><td class="detail">Littoral Acres</td><td>:</td><td class="data">${lakeProperties.littoralAcres}       </td></tr>`;
  popupContent +=   `<tr><td class="detail">Shoreline     </td><td>:</td><td class="data">${lakeProperties.shorelineMiles} miles</td></tr>`;
  popupContent +=   `<tr><td class="detail">Max Depth     </td><td>:</td><td class="data">${lakeProperties.maxDepth}&#39;       </td></tr>`;
  popupContent +=   `<tr><td class="detail">Average Depth </td><td>:</td><td class="data">${lakeProperties.averageDepth}&#39;   </td></tr>`;
  popupContent +=   `<tr><td class="detail">Water Clarity </td><td>:</td><td class="data">${lakeProperties.waterClarity}&#39;   </td></tr>`;
  popupContent += `</table>`;
  popupContent += `<div class="loader"><div></div><div></div><div></div><div></div><div></div></div>`;
  popup.setContent(popupContent);

  //fetch survey data for single lake
  fetch(`https://maps2.dnr.state.mn.us/cgi-bin/lakefinder/detail.cgi?type=lake_survey&id=${lakeProperties.id}`)
  .then(resp => resp.json())
  .then(surveyData => {
    popupContent = ``;
    popupContent += `<div class="title">${lakeProperties.name}</div>`;
    popupContent += `<table class="table">`;
    popupContent +=   `<tr><td class="detail">Acres         </td><td>:</td><td class="data">${lakeProperties.acres}               </td></tr>`;
    popupContent +=   `<tr><td class="detail">Littoral Acres</td><td>:</td><td class="data">${lakeProperties.littoralAcres}       </td></tr>`;
    popupContent +=   `<tr><td class="detail">Shoreline     </td><td>:</td><td class="data">${lakeProperties.shorelineMiles} miles</td></tr>`;
    popupContent +=   `<tr><td class="detail">Max Depth     </td><td>:</td><td class="data">${lakeProperties.maxDepth}&#39;       </td></tr>`;
    popupContent +=   `<tr><td class="detail">Average Depth </td><td>:</td><td class="data">${lakeProperties.averageDepth}&#39;   </td></tr>`;
    popupContent +=   `<tr><td class="detail">Water Clarity </td><td>:</td><td class="data">${lakeProperties.waterClarity}&#39;   </td></tr>`;
    popupContent += `</table>`;
    popupContent += `<div class="title">Survey Data</div>`;
    popupContent += `<canvas id="chart"></canvas>`;
    popup.setContent(popupContent);

    //sort the surveys by date
    sortedSurveys = surveyData.result.surveys.sort((a, b) => {
      return a.surveyDate > b.surveyDate;
    });

    //filter out targeted surveys of not correct species?
    //
    //

    //empty for surveys
    surveyDates = [],
    cpueDataset = [],
    weightDataset = [];

    //for each survey (lake selected has several surveys)
    sortedSurveys.forEach(survey => {

      //create array of survey dates for the chart
      surveyYear = survey.surveyDate.split('-')[0];
      surveyDates.push(surveyYear);

      //filter fishCatchSummaries to only include selected species
      sortedSummaries = survey.fishCatchSummaries.filter(summary => {
        return speciesCodes[summary.species] === species;
      });

      //empty for summaries
      summaryResults = {};
      summaryGearCount = 0
      cpueDataPoint = 0,
      weightDataPoint = 0;

      sortedSummaries.forEach(summary => {
        /*{ //example summaryResults object//
        "Special Seining":[CPUE, averageWeight, gearCount],
        "Standard Gill Nets":[CPUE, averageWeight, gearCount]
        }*/

        summaryGearCount += summary.gearCount;
        summaryResults[summary.gear] = [];
        summaryResults[summary.gear].push(summary.CPUE);
        summaryResults[summary.gear].push(summary.averageWeight);
        summaryResults[summary.gear].push(summary.gearCount);
      }); //end sortedSummaries.forEach

      /* //example data
      averageResults = {
        "MSK":{
          'SS': {
            'averageCPUE':	0.2,
            'averageWeight':	3
          },
          {
          'SGN'
            'averageCPUE':	0.35,
            'averageWeight':	7
          }
        }
      }

      summaryGearCount = 100

      summaryResults = {
        "Special Seining":[0.3, 4, 40],
        "Standard Gill Nets":[0.4, 10, 60]
      }

      //to find percent from average for weight
      //  SS[1]/MSK.SS.averageWeight = percent from average -  4/3 = 1.333
      //SGN[1]/MSK.SGN.averageWeight = percent from average - 10/7 = 1.428

      //1.333 * (40/100) = .5332
      //1.426 * (60/100) = .8556

      //add together = 1.3888, means 38.88% above average

      //to find percent from average for cpueDataPoint
      //  SS[0]/MSK.SS.averageCPUE = percent from average -  .3/.2 = 1.5
      //SGN[0]/MSK.SGN.averageCPUE = percent from average - .4/.35 = 1.14286

      //1.5     * (40/100) = .6
      //1.14286 * (60/100) = .6857

      //add together = 1.2857, means 28.57% above average*/

      //array of gear types used in this survey
      gearTypesUsed = Object.keys(summaryResults);

      gearTypesUsed.forEach(type => {
        //this gets the weighted average deviation from the statewide averages (averageResults.json)
        cpueDataPoint   += summaryResults[type][0]/averageResults[species][type].averageCPUE   * (summaryResults[type][2]/summaryGearCount);
        weightDataPoint += summaryResults[type][1]/averageResults[species][type].averageWeight * (summaryResults[type][2]/summaryGearCount);
      });

      //turn data point into percentage, fix to two decimal places, push to array for chart data
      cpueDataset.push(((cpueDataPoint-1)*100).toFixed(2));
      weightDataset.push(((weightDataPoint-1)*100).toFixed(2));
    }); //end of sortedSurveys.forEach

    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels: surveyDates,
        datasets: [{
          data: cpueDataset,
          label: "Quantity",
          borderColor: "#3e95cd",
          fill: false,
          lineTension: 0.2
        },
        {
          data: weightDataset,
          label: "Quality",
          borderColor: "#3f00cd",
          fill: false,
          lineTension: 0.2
        }]
      }
    }); //end new chart()
  }); //end fetch.then
} //end getSurveyData()
