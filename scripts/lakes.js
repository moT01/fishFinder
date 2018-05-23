//map layers (leaflet js)
const mapLayers = {
  lakeContours: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/lakefinder@mn_google/{z}/{x}/{y}.png'),
  terrain: L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', { id: 'mapbox.streets' }),
  satellite: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/img_fsa15aim4@mn_google/{z}/{x}/{y}.png'),
  compass: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/compass@mn_google/{z}/{x}/{y}.png')
};

//create map (leaflet js)
let map = L.map('map', {
  zoomSnap: 0,
  closePopupOnClick: false,
  zoomAnimation: false,
  fadeAnimation: false,
  markerZoomAnimation: false,
  autoPanPaddingTopLeft: 20,
  center: [46.3924658,-93.5],
  zoom: 6,
  maxZoom: 18,
  minZoom: 4,
  zoomControl: false,
  layers: [mapLayers.terrain, mapLayers.lakeContours],
  maxBounds:([
    [20, -135],
    [60, -55]
  ])
});

//create clusters (leaflet js)
let clusters = L.markerClusterGroup({
  showCoverageOnHover: true
});
map.addLayer(clusters);

//variables for elements used in popup
const popupContent = document.getElementById('popupContent'),
  popupLake = document.getElementById('popupLake'),
  popupCounty = document.getElementById('popupCounty'),
  popupAcres = document.getElementById('popupAcres'),
  popupShoreline = document.getElementById('popupShoreline'),
  popupDepth = document.getElementById('popupDepth'),
  popupClarity = document.getElementById('popupClarity'),
  popupSpecies = document.getElementById('popupSpecies'),
  popupLongest = document.getElementById('popupLongest'),
  popupLink = document.getElementById('popupLink'),
  popupLoader = document.getElementById('popupLoader'),
  popupAfterLoad = document.getElementById('popupAfterLoad');

//create popup (leaflet js)
let popup = L.popup({
  autoPan: false,
  minWidth: 642,
  minHeight: 463,
  closeOnEscapeKey: false,
  keepInView: true
});

//listener for change of species
document.getElementById('speciesInput').addEventListener('change', function() {
  changeSpecies(this.value);
});

//listener for change of map layers
document.querySelectorAll(".mapLayer").forEach(layer => {
  layer.addEventListener('click', function() {
    if(!map.hasLayer(mapLayers[this.title])) {
      map.eachLayer(layer => {
        map.removeLayer(layer);
      });
      map.addLayer(mapLayers[this.title]);
      map.addLayer(mapLayers.lakeContours);
      map.addLayer(clusters);
    }
  });
});

//variables for changeSpecies()
let lakeMarkers,
  speciesLayerShown = false;

//this gets what lakes have the selected species and displays the markers
function changeSpecies(species) {
  if(speciesLayerShown) {
    clusters.removeLayer(lakeMarkers);
  }

  //create layer for lake markers (leaflet js)
  lakeMarkers = L.geoJson(allLakesGeojson, {
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
        }
      }
    }
  });
  clusters.addLayer(lakeMarkers);
  speciesLayerShown = true;
}

function targetedSurveyIncludesSpecies(survey, species) {
  for (let i=0; i<survey.fishCatchSummaries.length; i++) {
    if(speciesCodes[survey.fishCatchSummaries[i].species] === species) {
      return true;
    }
  }
  return false;
}

//variables for getSurveyData()
let speciesCapitalized,
  //popupContent = '',
  surveyDates = [],
  surveysByDate = [],
  summariesWithSpecies = [],
  summaryResults = {},
  summaryGearCount = 0,
  tempCPUE,
  tempWeight,
  cpueDataPoint,
  weightDataPoint,
  cpueDataset = [],
  weightDataset = [],
  longestFish = 0;

//this gets the lake data from the dnr and displays it
function getSurveyData(lakeProperties, species) {
  //set base popup content before the rest is loaded
  popupAfterLoad.style.display = 'none';
  popupLake.innerHTML = lakeProperties.name;
  popupCounty.innerHTML = `${lakeProperties.county} county near ${lakeProperties.nearesTown}`;
  popupLoader.style.display = 'block';
  popup.setContent(popupContent);

  //fetch survey data for single lake
  fetch(`https://maps2.dnr.state.mn.us/cgi-bin/lakefinder/detail.cgi?type=lake_survey&id=${lakeProperties.id}`)
  .then(resp => resp.json())
  .then(surveyData => {

    //capitalize the species for use in the popup
    speciesCapitalized = species.split(" ");
    speciesCapitalized.forEach((word, index) => {
      speciesCapitalized[index] = word[0].toUpperCase() + word.substr(1);
    });
    speciesCapitalized = speciesCapitalized.join(' ');

    //set popup content after data is loaded
    popupLoader.style.display = 'none';
    popupAcres.innerHTML = surveyData.result.areaAcres;
    popupShoreline.innerHTML = `${surveyData.result.shoreLengthMiles} miles`;
    popupDepth.innerHTML = `${surveyData.result.maxDepthFeet}'`;
    popupClarity.innerHTML = `${surveyData.result.averageWaterClarity}'`;
    popupSpecies.innerHTML = `${speciesCapitalized} Data`;
    popupAfterLoad.style.display = 'block';
    popup.setContent(popupContent);

    //sort the surveys by date
    surveysByDate = surveyData.result.surveys.sort((a, b) => {
      return a.surveyDate > b.surveyDate;
    });

    //empty for surveys
    surveyDates = [],
    cpueDataset = [],
    weightDataset = [],
    longestCaught = 0;

    //for each survey (lake selected has several surveys)
    surveysByDate.forEach(survey => {
      //fishCatchSummaries.length > 0 (to rule out summaries without data)
      if(survey.fishCatchSummaries.length > 0) {
        //if not a targeted survey || a targeted survey that includes the species (so we don't display those targeted surveys without the species)
        if(survey.surveyType !== "Targeted Survey" || (survey.surveyType === "Targeted Survey" && targetedSurveyIncludesSpecies(survey, species))) {
          //this keeps track of the shortest and longest fish caught
          Object.keys(survey.lengths).forEach(fishType => {
            if(speciesCodes[fishType] === species) {
              longestCaught = survey.lengths[fishType].maximum_length > longestCaught ? survey.lengths[fishType].maximum_length : longestCaught;
            }
          });

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

            //this test puts an average CPUE for ones that have infity in the data
            if(summary.CPUE > 0) {
              summaryResults[summary.gear].push(summary.CPUE);
            } else {
              summaryResults[summary.gear].push(statewideAverages[species][summary.gear].averageCPUE);
            }

            //this test puts in an average weight for times the weight was not recorded
            if(summary.averageWeight > 0) {
              summaryResults[summary.gear].push(summary.averageWeight);
            } else {
              summaryResults[summary.gear].push(statewideAverages[species][summary.gear].averageWeight*0.0022046);
            }

            summaryResults[summary.gear].push(summary.gearCount);
          });

          //this calculates the deviation from average using the survey data and statewideAverages.js
          Object.keys(summaryResults).forEach(type => {
            //find the deviation from statewide average for CPUE (index 0) and weight (index 1) + convert pounds to grams for weight
            tempCPUE = summaryResults[type][0]/statewideAverages[species][type].averageCPUE;

            //this must be for ruling out weights with zeros or N/A or something like that
            if(summaryResults[type][1]/statewideAverages[species][type].averageWeight > 0) {
              tempWeight = 453.59237 * summaryResults[type][1]/statewideAverages[species][type].averageWeight;
            } else {
              tempWeight = 0;
            }

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
        }
      }
    }); //end of sortedSurveys.forEach


    popupLink.href = `https://www.dnr.state.mn.us/lakefind/lake.html?id=${lakeProperties.id}`;

    //add longest caught to popupContent if available
    if(longestCaught > 0) {
      popupLongest.innerHTML = `Longest Fish Sampled: ${longestCaught}"`;
      popupLongest.style.display = 'block';
      popup.setContent(popupContent);
    } else {
      popupLongest.style.display = 'none';
      popup.setContent(popupContent);
    }

    chart.destroy();

    //(if > 1) => make a line chart (chart js)
    if(surveyDates.length > 1) {
      chart = new Chart(chartElement, {
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
            pointHoverBackgroundColor: '#3e95cd'
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
        options: chartOptions
      }); //end new chart()

    //(if 1) => make a bar chart (chart js)
    } else if (surveyDates.length === 1) {
      chart = new Chart(chartElement, {
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
        options: chartOptions
      }); //end new chart()
    }
  }); //end fetch.then
} //end getSurveyData()

//create a chart
const chartElement = document.getElementById('chart');
let chart = new Chart(chartElement);

//variable for chart settings (chart js)
const chartOptions = {
  layout: {
    padding: {
      top: 0,
      bottom: 15
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
        beginAtZero: true,
        min: -100,
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
      },
      gridLines: {
        borderDash: [2, 6],
      },
    }]
  }
}
