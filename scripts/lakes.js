//map layers
const terrain = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', { id: 'mapbox.streets' });
const lakeContours = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/lakefinder@mn_google/{z}/{x}/{y}.png');
//var satellite = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/img_fsa15aim4@mn_google/{z}/{x}/{y}.png');
//var compass = L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/compass@mn_google/{z}/{x}/{y}.png');

//create map
let map = L.map('map', {
  zoomAnimation: false,
  fadeAnimation: false,
  markerZoomAnimation: false,
  center: [46.3924658,-93.5],
  zoom: 6,
  maxZoom: 18,
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
  keepInView: true,
  autoClose: false,
  autoPanPadding: 5,
  minWidth: 500,
  minHeight: 500
  //className: 'lakePopupWindow'
});

//variables for getSurveyData()
let speciesCapitalized,
  popupContent = '',
  surveyDates = [],
  surveysByDate = [],
  summariesWithSpecies = [],
  summaryResults = {},
  summaryGearCount = 0,
  gearTypesUsed = [],
  tempCPUE,
  tempWeight,
  cpueDataPoint,
  weightDataPoint,
  cpueDataset = [],
  weightDataset = [];

//this gets the lake data from the dnr and displays it
function getSurveyData(lakeProperties, species) {
  speciesCapitalized = species.split(" ");
  speciesCapitalized.forEach((word, index) => {
    speciesCapitalized[index] = word[0].toUpperCase() + word.substr(1);
  });
  speciesCapitalized = speciesCapitalized.join(' ');

  popupContent = ``;
  popupContent += `<div class="title">${lakeProperties.name}</div>`;
  popupContent += `<table>`;
  popupContent +=   `<tr><td class="detail">Acres         </td><td>:</td><td class="data">${lakeProperties.acres}               </td></tr>`;
  popupContent +=   `<tr><td class="detail">Littoral Acres</td><td>:</td><td class="data">${lakeProperties.littoralAcres}       </td></tr>`;
  popupContent +=   `<tr><td class="detail">Shoreline     </td><td>:</td><td class="data">${lakeProperties.shorelineMiles} miles</td></tr>`;
  popupContent += `</table>`
  popupContent += `<table>`
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
    popupContent += `<table class="tableInPopup">`;
    popupContent +=   `<tr><td class="detail">Acres         </td><td>:</td><td class="data">${lakeProperties.acres}               </td></tr>`;
    popupContent +=   `<tr><td class="detail">Littoral Acres</td><td>:</td><td class="data">${lakeProperties.littoralAcres}       </td></tr>`;
    popupContent +=   `<tr><td class="detail">Shoreline     </td><td>:</td><td class="data">${lakeProperties.shorelineMiles} miles</td></tr>`;
    popupContent += `</table>`
    popupContent += `<table class="tableInPopup">`
    popupContent +=   `<tr><td class="detail">Max Depth     </td><td>:</td><td class="data">${lakeProperties.maxDepth}&#39;       </td></tr>`;
    popupContent +=   `<tr><td class="detail">Average Depth </td><td>:</td><td class="data">${lakeProperties.averageDepth}&#39;   </td></tr>`;
    popupContent +=   `<tr><td class="detail">Water Clarity </td><td>:</td><td class="data">${lakeProperties.waterClarity}&#39;   </td></tr>`;
    popupContent += `</table><hr class="hrInPopup"><br>`;
    popupContent += `<div class="title">${speciesCapitalized} Data</div>`;
    popupContent += `<canvas id="chart"></canvas>`;
    popup.setContent(popupContent);

    //sort the surveys by date
    surveysByDate = surveyData.result.surveys.sort((a, b) => {
      return a.surveyDate > b.surveyDate;
    });

    //empty for surveys
    surveyDates = [],
    cpueDataset = [],
    weightDataset = [];

    //for each survey (lake selected has several surveys)
    surveysByDate.forEach(survey => {

      //create array of survey dates for the chart
      surveyYear = survey.surveyDate.split('-')[0];
      surveyDates.push(surveyYear);

      //filter fishCatchSummaries to only include selected species
      summariesWithSpecies = survey.fishCatchSummaries.filter(summary => {
        return speciesCodes[summary.species] === species;
      });

      //empty for summaries
      summaryResults = {};
      summaryGearCount = 0,
      cpueDataPoint = 0,
      weightDataPoint = 0;

      summariesWithSpecies.forEach(summary => {
        summaryGearCount += summary.gearCount;
        summaryResults[summary.gear] = [];
        summaryResults[summary.gear].push(summary.CPUE);
        summaryResults[summary.gear].push(summary.averageWeight);
        summaryResults[summary.gear].push(summary.gearCount);
      }); //end sortedSummaries.forEach

      //array of gear types used in this survey
      gearTypesUsed = Object.keys(summaryResults);

      //this calculates the deviation from average using the survey data and statewideAverages.js
      gearTypesUsed.forEach(type => {
        //find the deviation from statewide average for CPUE (index 0) and weight (index 1) + convert pounds to grams for weight
        tempCPUE   =             summaryResults[type][0]/statewideAverages[species][type].averageCPUE;
        tempWeight = 453.59237 * summaryResults[type][1]/statewideAverages[species][type].averageWeight;

        //calculate weighted average using the number of gear used (more gear = more weight)
        tempCPUE   *= (summaryResults[type][2]/summaryGearCount);
        tempWeight *= (summaryResults[type][2]/summaryGearCount);

        //accumulated weighted average
        cpueDataPoint   += tempCPUE;
        weightDataPoint += tempWeight;
      });

      //turn data points into percentage
      cpueDataPoint = (cpueDataPoint-1) * 100;
      weightDataPoint = (weightDataPoint-1) * 100;

      //fix to two decimal places and push to array for chart data
      cpueDataset.push(cpueDataPoint.toFixed(2));
      weightDataset.push(weightDataPoint.toFixed(2));
    }); //end of sortedSurveys.forEach

    //(if > 1) => make a line chart
    if(surveyDates.length > 1) {
      new Chart(document.getElementById('chart'), {
        type: 'line',
        data: {
          labels: surveyDates,
          datasets: [{
            data: cpueDataset,
            label: 'Catch Rate',
            borderColor: '#3e95cd',
            backgroundColor: '#fff',
            fill: false,
            lineTension: 0.2,
            pointRadius: 5,
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#3e95cd',
          },
          {
            data: weightDataset,
            label: 'Weight',
            borderColor: '#c2d593',
            backgroundColor: '#fff',
            fill: false,
            lineTension: 0.2,
            pointRadius: 5,
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#c2d593'
          }]
        },
        options: {
          layout: {
            padding: {
              top: 10
            }
          },
          tooltips: {
            callbacks: {
              title: function(tooltipItem, data) {
                return tooltipItem[0].xLabel +' Survey';
              },
              label: function(tooltipItem, data) {
                if(tooltipItem.yLabel === -100) {
                  return 'No fish sampled';
                } else if(tooltipItem.yLabel < 0) {
                  //dataset 0 for CPUE
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: ' + Math.abs(tooltipItem.yLabel) + '% below average';
                  //dataset 1 for weight
                  } else {
                    return 'weight: ' + Math.abs(tooltipItem.yLabel) + '% below average';
                  }
                } else if(tooltipItem.yLabel === 0) {
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: average';
                  } else {
                    return 'weight: average';
                  }
                } else {
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: ' + tooltipItem.yLabel + '% above average';
                  } else {
                    return 'weight: ' + tooltipItem.yLabel + '% above average ';
                  }
                }
              }
            }
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Fish Sampled',
                fontStyle: 'bold'
              },
              gridLines: {
                borderDash: [12, 2],
                zeroLineWidth: 1,
                zeroLineColor: 'black'
              },
              ticks: {
                fontSize: 10,
                fontFamily: "'Lucida Console', 'Monaco', monospace",
                min: -100,
                beginAtZero: true,
                callback: function(value, index, values) {
                  if(value === 0) {
                    return 'Average';
                  } else if(value === -100) {
                    return 'None';
                  } else if(value > 0) {
                    return '+' +value+ '%';
                  } else if(value < 0) {
                    return value + '%';
                  }
                }
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Survey Year',
                fontStyle: 'bold'
              },
              gridLines: {
                borderDash: [2, 6],
              },
              ticks: {
                fontSize: 10,
                fontFamily: "'Lucida Console', 'Monaco', monospace"
              }
            }]
          }
        }
      }); //end new chart()

    //(if 1) => make a bar chart
    } else if (surveyDates.length === 1) {
      new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: {
          labels: surveyDates,
          datasets: [{
            data: cpueDataset,
            label: "Catch Rate",
            backgroundColor: "#3e95cd",
            fill: true,
          },
          {
            data: weightDataset,
            label: "Weight",
            backgroundColor: "#c2d593",
            fill: true,
          }]
        },
        options: {
          tooltips: {
            callbacks: {
              title: function(tooltipItem, data) {
                return tooltipItem[0].xLabel +' Survey';
              },
              label: function(tooltipItem, data) {
                if(tooltipItem.yLabel === -100) {
                  return 'No fish sampled';
                } else if(tooltipItem.yLabel < 0) {
                  //dataset 0 for CPUE
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: ' + Math.abs(tooltipItem.yLabel) + '% below average';
                  //dataset 1 for weight
                  } else {
                    return 'weight: ' + Math.abs(tooltipItem.yLabel) + '% below average';
                  }
                } else if(tooltipItem.yLabel === 0) {
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: average';
                  } else {
                    return 'weight: average';
                  }
                } else {
                  if(tooltipItem.datasetIndex === 0) {
                    return 'catch rate: ' + tooltipItem.yLabel + '% above average';
                  } else {
                    return 'weight: ' + tooltipItem.yLabel + '% above average ';
                  }
                }
              }
            }
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Fish Sampled',
                fontStyle: 'bold'
              },
              gridLines: {
                zeroLineWidth: 1,
                zeroLineColor: 'black'
              },
              ticks: {
                fontSize: 10,
                fontFamily: "'Lucida Console', 'Monaco', monospace",
                beginAtZero: true,
                callback: function(value, index, values) {
                  if(value === 0) {
                    return 'Average';
                  } else if(value === -100) {
                    return 'None';
                  } else if(value > 0) {
                    return '+' +value+ '%';
                  } else if(value < 0) {
                    return value + '%';
                  }
                }
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Survey Year',
                fontStyle: 'bold'
              },
              ticks: {
                fontSize: 10,
                fontFamily: "'Lucida Console', 'Monaco', monospace"
              }
            }]
          }
        }
      }); //end new chart()
    }
  }); //end fetch.then
} //end getSurveyData()
