//global variables //global variables //global variables //global variables //global variables
const speciesInput = document.getElementById('speciesInput'),
  chartElement = document.getElementById('chart'),
  popupContent = document.getElementById('popupContent'),
  popupClose = document.getElementById('popupClose'),
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
  popupAfterLoad = document.getElementById('popupAfterLoad'),
  mapLayers = document.querySelectorAll('.mapLayer'),
  tileLayers = {
    lakeContours: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/lakefinder@mn_google/{z}/{x}/{y}.png'),
    terrain: L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', { id: 'mapbox.streets' }),
    satellite: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/img_fsa15aim4@mn_google/{z}/{x}/{y}.png'),
    compass: L.tileLayer('https://maps1.dnr.state.mn.us/mapcache/gmaps/compass@mn_google/{z}/{x}/{y}.png')
  },
  chartOptions = {
    layout: {
      padding: {
        top: 0,
        bottom: 5
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
  };

let popupWidth = window.innerWidth < 600 ? window.innerWidth : 600,
  lakeMarkers,
  speciesLayerShown = false,
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
  longestFish = 0,
  clusters = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true
  }),
  map = L.map('map', {
    zoomSnap: 0,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    center: [46.3924658,-93.5],
    zoom: 6.5,
    maxZoom: 18,
    minZoom: 5.5,
    zoomControl: false,
    doubleClickZoom: false,
    layers: [tileLayers.terrain, tileLayers.lakeContours],
    maxBounds:([
      [20, -135],
      [60, -55]
    ])
  }),
  chart = new Chart(chartElement);

//global functions //global functions //global functions //global functions //global functions
function targetedSurveyIncludesSpecies(survey, species) {
  for (let i=0; i<survey.fishCatchSummaries.length; i++) {
    if(speciesCodes[survey.fishCatchSummaries[i].species] === species) {
      return true;
    }
  }
  return false;
}

function capitalize(fishName) {
  fishName = fishName.split(" ");
  fishName.forEach((word, index) => {
    fishName[index] = word[0].toUpperCase() + word.substr(1);
  });
  return fishName.join(' ');
}

function changeSpecies(species) {
  if(speciesLayerShown) {
    clusters.removeLayer(lakeMarkers);
  }

  lakeMarkers = L.geoJson(allLakesGeojson, {
    pointToLayer: function(feature, LatLng){
      let marker = L.marker(LatLng),
        popup = L.popup({
          minWidth: popupWidth,
          closeOnClick: true,
          closeOnEscapeKey: false,
          keepInView: true
        });
      marker.bindPopup(popup);
      popup.setContent(popupContent);
      marker.bindTooltip(feature.properties.name);
      marker.on('click', function() {
        getSurveyData(this.feature.properties, species);
      });

      //return a marker for any lake with selected species
      for(let i=0; i<feature.properties.fishSpecies.length; i++) {
        if(speciesMerged[feature.properties.fishSpecies[i]] === species) {
          return marker;
        }
      }
    }
  });
  clusters.addLayer(lakeMarkers);
  speciesLayerShown = true;
}

function getSurveyData(lakeProperties, species) {
  //set base popup content before the rest is loaded
  popupAfterLoad.style.display = 'none';
  popupLake.innerHTML = lakeProperties.name;
  popupCounty.innerHTML = `${lakeProperties.county} county near ${lakeProperties.nearesTown}`;
  popupLoader.style.display = 'block';

  //fetch survey data for single lake
  fetch(`https://maps2.dnr.state.mn.us/cgi-bin/lakefinder/detail.cgi?type=lake_survey&id=${lakeProperties.id}`)
  .then(resp => resp.json())
  .then(surveyData => {

    //set popup content after data is loaded
    popupLoader.style.display = 'none';
    popupAcres.innerHTML = surveyData.result.areaAcres;
    popupShoreline.innerHTML = `${surveyData.result.shoreLengthMiles} miles`;
    popupDepth.innerHTML = `${surveyData.result.maxDepthFeet}'`;
    popupClarity.innerHTML = `${surveyData.result.averageWaterClarity}'`;
    popupSpecies.innerHTML = `${capitalize(species)} Data`;
    popupAfterLoad.style.display = 'block';

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
          //this keeps track of the longest fish caught
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
            summary.CPUE > 0 ? summaryResults[summary.gear].push(summary.CPUE) : summaryResults[summary.gear].push(statewideAverages[species][summary.gear].averageCPUE);
            //this test puts in an average weight for times the weight was not recorded
            summary.averageWeight > 0 ? summaryResults[summary.gear].push(summary.averageWeight) : summaryResults[summary.gear].push(statewideAverages[species][summary.gear].averageWeight*0.0022046);
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
    } else {
      popupLongest.style.display = 'none';
    }

    newChart();
  });
}

function newChart() {
  chart.destroy();

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
    });
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
    });
  }
}

//event listeners //event listeners //event listeners //event listeners //event listeners
speciesInput.addEventListener('change', function() {
  changeSpecies(this.value);
});

mapLayers.forEach(layer => {
  layer.addEventListener('click', function() {
    if(!map.hasLayer(tileLayers[this.title])) {
      map.eachLayer(layer => {
        map.removeLayer(layer);
      });
      map.addLayer(tileLayers[this.title]);
      map.addLayer(tileLayers.lakeContours);
      map.addLayer(clusters);
    }
  });
});

window.addEventListener('resize', function() {
  popupWidth = window.innerWidth < 600 ? window.innerWidth : 600;
});

map.addLayer(clusters);
