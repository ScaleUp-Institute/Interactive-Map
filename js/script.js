// Initialize the map
var map = L.map('map').setView([54.5, -3], 6);

// Add CartoDB Positron tile layer
var baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Map event listeners
// Hide info box when clicking on the map (outside polygons)
map.on('click', function (e) {
  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.classList.add('hidden');
  }
});

// Create custom panes
map.createPane('polygonsPane');
map.getPane('polygonsPane').style.zIndex = 400; // Below markerPane (600)

map.getPane('markerPane').style.zIndex = 600;

// Global variables
var csvData;
var localAuthoritiesLayer;
var finalAreasLayer;
var finalAreasGeoJSONData;
var companyData = [];
var scaleupData;
var scaleupLayers = {};
var searchControl;
var legend;
var layerControl;
var sectorControl;
var clusterControl;
var polygonToggleControl;
var ukBoundaryLayer;
var clusterLayers = {};
var currentSectors = []; // Array to hold selected sectors
var currentClusters = []; // Array to hold selected clusters
var polygonVisibility = false;
var clusterColors = {};
var sectorColors = {};
var sectorPolygonLayers = {};
var displayMode = 'points'; // 'points', 'polygons', or 'both'
var clusterSummaryData = {}; // Object to hold summary data for clusters
var sectorStats = {}; // Object to hold overall statistics per sector

var areaColors = {
  'Buckinghamshire': '#d0f0c0',                  // Light green
  'Cambridgeshire and Peterborough': '#a2d9b1',
  'Cheshire and Warrington': '#75c2a3',
  'Cornwall and Isles of Scilly': '#4aab94',
  'Cumbria': '#1d9486',
  'Devon': '#007d77',                            // Medium teal
  'Dorset': '#006e6a',
  'East Midlands CCA': '#005f5e',
  'East Sussex': '#004f51',
  'Essex': '#003f45',                            // Dark teal
  'Gloucestershire': '#cce5ff',                  // Light blue
  'Greater Lincolnshire': '#99ccff',
  'Greater Manchester CA': '#66b2ff',
  'Hampshire area': '#3399ff',
  'Hertfordshire': '#0080ff',
  'Hull and East Yorkshire': '#0066cc',
  'Kent': '#0059b3',
  'Lancashire': '#004d99',
  'Leicester and Leicestershire': '#004080',
  'Liverpool City Region CA': '#003366',         // Dark blue
  'London': '#00264d',
  'New Anglia': '#001a33',
  'North East CA': '#00111f',
  'Oxfordshire': '#000d17',
  'Solent': '#d0f0c0',                           // Repeat colors if needed
  'The Marches': '#a2d9b1',
  'Somerset': '#75c2a3',
  'South East Midlands': '#4aab94',
  'South Yorkshire CA': '#1d9486',
  'Stoke-on-Trent and Staffordshire': '#007d77',
  'Surrey': '#006e6a',
  'Swindon and Wiltshire': '#005f5e',
  'Tees Valley CA': '#004f51',
  'Thames Valley Berkshire': '#003f45',
  'Warwickshire': '#cce5ff',
  'West Midlands CA': '#99ccff',
  'West of England CA': '#66b2ff',
  'Coast to Capital': '#3399ff',
  'West Yorkshire CA': '#0080ff',
  'Worcestershire': '#0066cc',
  'York and North Yorkshire CA': '#0059b3',
  'Northern Ireland': '#004d99',
  'Scotland': '#004080',
  'Wales': '#003366'
};

// Define color scales for scaleup data columns
var scaleupColorScales = {
  'Scaleup density per 100k (2022)': chroma.scale(['#eff3ff', '#084594']).classes(5),
  'Avg growth in scaleup density (2013-2022)': chroma.scale(['#fee5d9', '#a50f15']).classes(5)
};

// List of sectors and corresponding CSV files
var sectors = {
  'Advanced Manufacturing': 'Adv_man_clusters10.csv',
  'Agritech': 'Agritech_clusters7.csv',
  'Creative Industries': 'Creative_Industries_clusters15.csv',
  'Fintech': 'Fintech_clusters12.csv',
  'Net Zero': 'NetZero_clusters20.csv',
  'Professional Services': 'Prof_Services_clusters25.csv',
  'Technology': 'Techs_clusters35.csv',
  'Telecoms Technology': 'TelecomsTechs_clusters15.csv',
  'Life Sciences': 'LifeSciences_clusters20.csv'
};

var summaryStatsFiles = {
  'Advanced Manufacturing': 'summarystats_Adv_man.csv',
  'Agritech': 'summarystats_Agritech.csv',
  'Creative Industries': 'summarystats_Creative_Industries.csv',
  'Fintech': 'summarystats_Fintech.csv',
  'Net Zero': 'summarystats_NetZero.csv',
  'Life Sciences': 'summarystats_Life_Sciences.csv',
  'Professional Services': 'summarystats_Prof_Services.csv',
  'Technology': 'summarystats_Tech.csv',
  'Telecoms Technology': 'summarystats_Telecoms.csv'
};

var financialDataFiles = {
  'Advanced Manufacturing': 'financials_Adv_man.csv',
  'Agritech': 'financials_Agritech.csv',
  'Creative Industries': 'financials_Creative_Industries.csv',
  'Fintech': 'financials_Fintech.csv',
  'Life Sciences': 'financials_Life_Sciences.csv',
  'Net Zero': 'financials_Net_Zero.csv',
  'Professional Services': 'financials_Prof_Services.csv',
  'Technology': 'financials_Tech.csv',
  'Telecoms Technology': 'financials_Telecoms.csv'
};

// Assign colors to sectors
var sectorColors = {
  'Advanced Manufacturing': 'rgba(255, 0, 0, 0.5)',    // Red with transparency
  'Agritech': '#008080',                              // Teal
  'Creative Industries': '#FF69B4',                   // Bright pink
  'Fintech': '#FFFF00',                               // Yellow
  'Life Sciences': '#800080',                         // Purple
  'Net Zero': '#1646a0',                              // Dark Blue
  'Clean Tech': '#FFB6C1',                            // Dusky pink
  'Professional Services': '#008000',                 // Green
  'Telecoms Technology': '#A9A9A9',                    // Grey
  'Technology': '#FFA500'                              // Orange
};

// Initialize the application by loading LAD data
Papa.parse('data/lad_data.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: function (results) {
    csvData = results.data;
    loadLocalAuthoritiesLayer();
  },
  error: function (error) {
    console.error('Error parsing LAD CSV:', error);
  }
});

function loadLocalAuthoritiesLayer() {
  fetch('data/uk-regions.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      mergeData(geojsonData);
    })
    .catch(error => console.error('Error loading GeoJSON:', error));
}

function loadUKBoundary() {
  $.getJSON('data/uk-boundary.geojson', function (geojsonData) {
    // Create the mask layer using the plugin
    var maskLayer = L.mask(geojsonData).addTo(map);

    // Set style for the mask layer
    maskLayer.setStyle({
      color: '#000',
      fillColor: '#000',
      fillOpacity: 1,
      weight: 0
    });

    // Bring cluster layers to the front
    bringClusterLayersToFront();
  });
}

function mergeData(geojsonData) {
  var csvDataLookup = {};
  csvData.forEach(function (row) {
    var ladCode = row.LAD23CD ? row.LAD23CD.trim().toUpperCase() : null;
    if (ladCode) {
      if (row['Final area']) {
        row['Final area'] = row['Final area'].trim();
      }
      csvDataLookup[ladCode] = row;
    } else {
      console.warn('Missing LAD23CD in CSV row:', row);
    }
  });

  geojsonData.features.forEach(function (feature) {
    var ladCode = feature.properties.LAD23CD ? feature.properties.LAD23CD.trim().toUpperCase() : null;
    if (ladCode && csvDataLookup[ladCode]) {
      feature.properties = {
        ...feature.properties,
        ...csvDataLookup[ladCode]
      };
    } else {
      console.warn(`No matching CSV data for LAD code: ${ladCode}`);
    }
  });

  localAuthoritiesLayer = L.geoJSON(geojsonData, {
    pane: 'polygonsPane',
    style: localAuthoritiesStyle,
    onEachFeature: onEachLocalAuthorityFeature
  });

  loadFinalAreasLayer();
}

// Function to load UK Boundary GeoJSON
function loadUKBoundaryLayer() {
  fetch('data/uk_outer_boundary.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      ukBoundaryLayer = L.geoJSON(geojsonData, {
        pane: 'polygonsPane',
        style: {
          color: '#000000',       // Assign desired border color
          weight: 1,
          fillColor: '#FFFFFF',   // Assign desired fill color
          fillOpacity: 1.0
        },
        onEachFeature: function (feature, layer) {
          // Optional: Bind popups if needed
        }
      });
      layerControl.addOverlay(ukBoundaryLayer, 'UK Boundary');
    })
    .catch(error => console.error('Error loading UK boundary GeoJSON:', error));
}

function loadFinalAreasLayer() {
  fetch('data/final_areas.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      finalAreasGeoJSONData = geojsonData;
      loadScaleupData();
    })
    .catch(error => console.error('Error loading Final Areas GeoJSON:', error));
}

function loadScaleupData() {
  Papa.parse('data/scaleup_data.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      scaleupData = results.data;
      processScaleupData();
    },
    error: function (error) {
      console.error('Error parsing scaleup data CSV:', error);
      processScaleupData();
    }
  });
}

function processScaleupData() {
  try {
    var scaleupDataLookup = {};

    scaleupData.forEach(function (row) {
      var areaName = row['LOCAL AREA'] ? row['LOCAL AREA'].trim() : null;
      if (areaName) {
        ['No of Scaleups (2022)', 'Scaleup density per 100k (2022)', 'Avg growth in scaleup density (2013-2022)'].forEach(function (columnName) {
          var value = row[columnName];
          if (typeof value === 'string') {
            value = value.replace(/[^0-9.-]+/g, '');
            value = parseFloat(value);
            if (isNaN(value)) {
              console.warn('Invalid number in scaleup data for area', areaName, 'column', columnName, 'value:', row[columnName]);
              value = null;
            }
            row[columnName] = value;
          } else if (typeof value !== 'number') {
            row[columnName] = null;
          }
        });
        scaleupDataLookup[areaName] = row;
      } else {
        console.warn('Missing LOCAL AREA in scaleup data row:', row);
      }
    });

    finalAreasGeoJSONData.features.forEach(function (feature) {
      var areaName = feature.properties['Final area'];
      if (areaName && scaleupDataLookup[areaName]) {
        feature.properties = {
          ...feature.properties,
          ...scaleupDataLookup[areaName]
        };
      } else {
        console.warn(`No matching scaleup data for area: ${areaName}`);
      }
    });

    finalAreasLayer = L.geoJSON(finalAreasGeoJSONData, {
      pane: 'polygonsPane',
      style: finalAreasStyle,
      onEachFeature: onEachFinalAreaFeature
    });

    createScaleupLayers();

  } catch (error) {
    console.error('Error processing scaleup data:', error);
  } finally {
    finalizeMapSetup();
  }
}

function finalizeMapSetup() {
  addSearchControl(); // Initialize searchControl first
  addLayerControl();
  addLegend();
  addSectorControl();
  addPolygonToggleControl();
  loadUKBoundaryLayer();      // Add this line
}

function localAuthoritiesStyle(feature) {
  return {
    fillColor: getColor(feature.properties['Final area']),
    weight: 0.5,
    color: '#333',
    fillOpacity: 0.8,
    interactive: true
  };
}

function finalAreasStyle(feature) {
  return {
    fillColor: getColor(feature.properties['Final area']),
    weight: 1,
    color: '#000',
    fillOpacity: 0.7,
    interactive: true
  };
}

function getColor(area) {
  return areaColors[area] || '#FFFFFF';
}

function getClusterColor(clusterId) {
  var clusterNumber = clusterId.split('_')[1];
  if (clusterNumber === '0') {
    return '#D3D3D3'; // Light grey for Cluster 0
  }
  return clusterColors[clusterId];
}

function getScaleupDensityColor(value) {
  if (value < 40) {
    return '#00008B';
  } else if (value >= 40 && value < 45) {
    return '#4169E1';
  } else if (value >= 45 && value < 50) {
    return '#87CEFA';
  } else if (value >= 50 && value <= 60) {
    return '#7FFFD4';
  } else if (value > 60) {
    return '#006400';
  } else {
    return '#FFFFFF';
  }
}

function getAvgGrowthColor(value) {
  if (value < 0) {
    return '#00008B'; // Dark blue
  } else if (value >= 0 && value < 1) {
    return '#87CEFA'; // Light blue
  } else if (value >= 1 && value <= 2) {
    return '#20B2AA'; // Light blue-green (teal)
  } else if (value > 2) {
    return '#006400'; // Dark green
  } else {
    return '#FFFFFF'; // Default color for invalid or missing data
  }
}

function getScaleupColor(value, columnName) {
  if (columnName === 'Scaleup density per 100k (2022)') {
    return getScaleupDensityColor(value);
  } else if (columnName === 'Avg growth in scaleup density (2013-2022)') {
    return getAvgGrowthColor(value); 
  } else {
    var scale = scaleupColorScales[columnName];
    if (!scale) {
      console.error('No color scale found for column:', columnName);
      return '#FFFFFF';
    }

    var min = getMinValue(columnName);
    var max = getMaxValue(columnName);

    if (isNaN(min) || isNaN(max) || min === max) {
      console.error('Invalid min or max value for column:', columnName, 'Min:', min, 'Max:', max);
      return '#FFFFFF';
    }

    scale.domain([min, max]);

    if (typeof value === 'number' && !isNaN(value)) {
      return scale(value).hex();
    } else {
      return '#FFFFFF';
    }
  }
}

function getMinValue(columnName) {
  var values = scaleupData.map(row => row[columnName]).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) {
    console.error('No valid numeric values found for column:', columnName);
    return 0;
  }
  return Math.min(...values);
}

function getMaxValue(columnName) {
  var values = scaleupData.map(row => row[columnName]).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) {
    console.error('No valid numeric values found for column:', columnName);
    return 1;
  }
  return Math.max(...values);
}

function onEachLocalAuthorityFeature(feature, layer) {
  var props = feature.properties;

  layer.layerSource = 'Local Authorities';

  var popupContent = `
    <div class="popup-content">
      <h3>${props.lad || props.LAD23NM}</h3>
      <p><strong>Final Area:</strong> ${props['Final area'] || 'N/A'}</p>
    </div>
  `;

  layer.bindPopup(popupContent);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

function onEachFinalAreaFeature(feature, layer) {
  var props = feature.properties;

  layer.layerSource = 'Final Areas';

  var popupContent = `
    <div class="popup-content">
      <h3>${props['Final area']}</h3>
    </div>
  `;

  layer.bindPopup(popupContent);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 3,
    color: '#666',
    fillOpacity: 0.9
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

function resetHighlight(e) {
  var layer = e.target;

  if (layer.layerSource) {
    var layerSource = layer.layerSource;

    if (layerSource === 'Local Authorities' && localAuthoritiesLayer) {
      localAuthoritiesLayer.resetStyle(layer);
    } else if (layerSource === 'Final Areas' && finalAreasLayer) {
      finalAreasLayer.resetStyle(layer);
    } else if (scaleupLayers[layerSource]) {
      scaleupLayers[layerSource].resetStyle(layer);
    }
  }
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function createScaleupLayers() {
  ['Scaleup density per 100k (2022)', 'Avg growth in scaleup density (2013-2022)'].forEach(function (columnName) {
    var geojsonFeatures = JSON.parse(JSON.stringify(finalAreasGeoJSONData));

    scaleupLayers[columnName] = L.geoJSON(geojsonFeatures, {
      pane: 'polygonsPane',
      style: scaleupStyleFactory(columnName),
      onEachFeature: onEachScaleupFeatureFactory(columnName)
    });
  });
}

function scaleupStyleFactory(columnName) {
  return function (feature) {
    var value = feature.properties[columnName];
    return {
      fillColor: getScaleupColor(value, columnName),
      weight: 1,
      color: '#000',
      fillOpacity: 1.0,
      interactive: true
    };
  };
}

function onEachScaleupFeatureFactory(columnName) {
  return function (feature, layer) {
    var props = feature.properties;
    var value = props[columnName] !== undefined ? props[columnName] : 'No data';
    var noOfScaleups = props['No of Scaleups (2022)'] !== undefined ? props['No of Scaleups (2022)'] : 'No data';

    layer.layerSource = columnName;

    var popupContent = `
      <div class="popup-content">
        <h3>${props['Final area']}</h3>
        <p><strong>${columnName}:</strong> ${value}</p>
        <p><strong>No of Scaleups (2022):</strong> ${noOfScaleups}</p>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });
  };
}

function addLayerControl() {
  var overlays = {
    'Local Authorities': localAuthoritiesLayer,
    'Final Areas': finalAreasLayer,
    'Scaleup density per 100k (2022)': scaleupLayers['Scaleup density per 100k (2022)'],
    'Avg growth in scaleup density (2013-2022)': scaleupLayers['Avg growth in scaleup density (2013-2022)']
  };

  if (layerControl) {
    map.removeControl(layerControl);
  }

  layerControl = L.control.layers({}, overlays, { collapsed: false }).addTo(map);

  map.on('overlayadd', function (e) {
    removeClusterLayers();
    var layerName = getLayerName(e.layer);
    updateLegend(layerName);
    updateSearchControl(layerName);
  });

  map.on('overlayremove', function (e) {
    var layerName = getLayerName(e.layer);
    updateLegend('');
    updateSearchControl('');
  });

  function getLayerName(layer) {
    for (var name in overlays) {
      if (overlays[name] === layer) {
        return name;
      }
    }
    return '';
  }
}

function addLegend() {
  if (legend) {
    map.removeControl(legend);
  }

  legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
      <div class="legend-header">
        <span><strong>Legend</strong></span>
        <button id="legend-toggle" style="float: right;">Hide</button>
      </div>
      <div id="legend-content">
        <!-- Legend entries will be inserted here -->
      </div>
    `;
    this._div = div;
    this.update('');
    return this._div;
  };

  legend.update = function (layerName) {
    var contentDiv = this._div.querySelector('#legend-content');
    contentDiv.innerHTML = '';

    if (layerName === 'Scaleup density per 100k (2022)') {
      contentDiv.innerHTML += `<strong>${layerName}</strong><br>`;
      var labels = [];

      labels.push(
        '<i style="background:#006400"></i> Greater than 60'
      );
      labels.push(
        '<i style="background:#7FFFD4"></i> 50 - 60'
      );
      labels.push(
        '<i style="background:#87CEFA"></i> 45 - 50'
      );
      labels.push(
        '<i style="background:#4169E1"></i> 40 - 45'
      );
      labels.push(
        '<i style="background:#00008B"></i> Fewer than 40'
      );

      contentDiv.innerHTML += labels.join('<br>');
    } else if (layerName === 'Avg growth in scaleup density (2013-2022)') {
      contentDiv.innerHTML += `<strong>${layerName}</strong><br>`;
      var labels = [];
    
      labels.push(
        '<i style="background:#006400"></i> Greater than 2'
      );
      labels.push(
        '<i style="background:#20B2AA"></i> 1 - 2'
      );
      labels.push(
        '<i style="background:#87CEFA"></i> 0 - 1'
      );
      labels.push(
        '<i style="background:#00008B"></i> Fewer than 0'
      );
    
      contentDiv.innerHTML += labels.join('<br>');
    } else if (layerName === 'Company Clusters') {
      updateLegendForClusters();
    } else if (layerName === 'Local Authorities') {
      contentDiv.innerHTML += '<strong>Local Authorities</strong><br>';
      contentDiv.innerHTML += '<p>Each area represents a local authority.</p>';
    } else if (layerName === 'Final Areas') {
      contentDiv.innerHTML += '<strong>Final Areas</strong><br>';
      var areas = Object.keys(areaColors).sort();
      areas.forEach(function (area) {
        contentDiv.innerHTML +=
          '<i style="background:' + areaColors[area] + '"></i> ' +
          area + '<br>';
      });
    } else {
      contentDiv.innerHTML += '<p>Select a layer to view the legend.</p>';
    }
  };

  legend.addTo(map);

  map.whenReady(function () {
    var toggleButton = document.getElementById('legend-toggle');
    var legendContent = document.getElementById('legend-content');

    toggleButton.onclick = function () {
      if (legendContent.style.display === 'none') {
        legendContent.style.display = 'block';
        toggleButton.textContent = 'Hide';
      } else {
        legendContent.style.display = 'none';
        toggleButton.textContent = 'Show';
      }
    };
  });
}

function updateLegend(activeLayerName) {
  if (legend) {
    if (activeLayerName === 'Company Clusters' || activeLayerName === '') {
      updateLegendForClusters();
    } else {
      legend.update(activeLayerName);
    }
  }
}

function formatTurnover(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  // Determine the appropriate notation
  if (value >= 1e9) {
    // Value is in billions
    return '£' + (value / 1e9).toFixed(1) + ' billion';
  } else if (value >= 1e6) {
    // Value is in millions
    return '£' + (value / 1e6).toFixed(1) + ' million';
  } else if (value >= 1e3) {
    // Value is in thousands
    return '£' + (value / 1e3).toFixed(1) + ' thousand';
  } else {
    // Value is less than a thousand
    return '£' + value.toFixed(0);
  }
}

function updateLegendForClusters() {
  var contentDiv = legend._div.querySelector('#legend-content');
  contentDiv.innerHTML = '<strong>Company Clusters</strong><br>';

  if (currentSectors.length === 1) {
    // Only one sector selected, show clusters with their colors
    var clustersInSector = Object.keys(clusterColors).filter(function (clusterId) {
      return clusterId.startsWith(currentSectors[0]);
    });

    clustersInSector.forEach(function (clusterId) {
      var clusterName = getClusterNameById(clusterId);
      var clusterColor = getClusterColor(clusterId);

      contentDiv.innerHTML +=
        '<i style="background:' + clusterColor + '"></i> ' +
        clusterName + '<br>';
    });
  } else {
    // Multiple sectors selected, show sectors with their colors
    currentSectors.forEach(function (sector) {
      var sectorColor = sectorColors[sector];

      contentDiv.innerHTML +=
        '<i style="background:' + sectorColor + '"></i> ' +
        sector + '<br>';
    });
  }
}

function getClusterNameById(clusterId) {
  var company = companyData.find(function (comp) {
    return comp.clusterId === clusterId;
  });
  if (company) {
    return company.Cluster_name + ' (Cluster ' + company.cluster + ')';
  }
  return clusterId;
}

function addSearchControl() {
  searchControl = new L.Control.Search({
    layer: null,
    propertyName: 'lad',
    marker: false,
    initial: false,
    zoom: 10,
    moveToLocation: function (latlng) {
      map.fitBounds(latlng.layer.getBounds());
      highlightFeature({ target: latlng.layer });
    }
  });

  searchControl.addTo(map);
}

function updateSearchControl(activeLayerName) {
  if (!searchControl) {
    return; // If searchControl is not initialized, do nothing
  }

  if (activeLayerName === 'Local Authorities' && localAuthoritiesLayer) {
    searchControl.setLayer(localAuthoritiesLayer);
    searchControl.options.propertyName = 'lad';
    searchControl.indexFeatures();
    searchControl.addTo(map);
  } else if (activeLayerName === 'Final Areas' && finalAreasLayer) {
    searchControl.setLayer(finalAreasLayer);
    searchControl.options.propertyName = 'Final area';
    searchControl.indexFeatures();
    searchControl.addTo(map);
  } else if (scaleupLayers[activeLayerName]) {
    searchControl.setLayer(scaleupLayers[activeLayerName]);
    searchControl.options.propertyName = 'Final area';
    searchControl.indexFeatures();
    searchControl.addTo(map);
  } else {
    map.removeControl(searchControl);
  }
}

function addSectorControl() {
  var sectorDiv = L.control({ position: 'topright' });
  sectorDiv.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'sector-control');
    var html = '<label>Select Sectors:</label><br>';
    html += '<button id="select-all-sectors">Select All</button>';
    html += '<button id="deselect-all-sectors">Clear Selection</button><br>';
    html += '<div id="sector-checkboxes">';
    for (var sector in sectors) {
      html += '<input type="checkbox" class="sector-checkbox" value="' + sector + '"> ' + sector + '<br>';
    }
    html += '</div>';
    // Add the 'Overall Stats' button
    html += '<button id="overall-stats-button" disabled>Overall Stats</button>';
    div.innerHTML = html;

    // Disable click events from propagating to the map
    L.DomEvent.disableClickPropagation(div);

    // Attach event listeners here
    L.DomEvent.on(div.querySelector('#select-all-sectors'), 'click', function () {
      var checkboxes = div.querySelectorAll('.sector-checkbox');
      checkboxes.forEach(function (checkbox) {
        checkbox.checked = true;
      });
      currentSectors = Object.keys(sectors);
      removeClusterLayers();
      removeOtherLayers();
      if (layerControl) {
        map.removeControl(layerControl);
      }
      loadSectorsData(currentSectors);

      // Update 'Overall Stats' button state
      div.querySelector('#overall-stats-button').disabled = false;
    });

    L.DomEvent.on(div.querySelector('#deselect-all-sectors'), 'click', function () {
      var checkboxes = div.querySelectorAll('.sector-checkbox');
      checkboxes.forEach(function (checkbox) {
        checkbox.checked = false;
      });
      currentSectors = [];
      removeClusterLayers();
      updateLegend('');
      if (layerControl) {
        layerControl.addTo(map);
      }
      if (clusterControl) {
        map.removeControl(clusterControl);
      }

      // Update 'Overall Stats' button state
      div.querySelector('#overall-stats-button').disabled = true;
    });

    var checkboxes = div.querySelectorAll('.sector-checkbox');
    checkboxes.forEach(function (checkbox) {
      L.DomEvent.on(checkbox, 'change', function () {
        currentSectors = Array.from(div.querySelectorAll('.sector-checkbox:checked')).map(function (cb) {
          return cb.value;
        });

        // Update 'Overall Stats' button state
        div.querySelector('#overall-stats-button').disabled = currentSectors.length === 0;

        if (currentSectors.length > 0) {
          removeClusterLayers();
          removeOtherLayers();
          if (layerControl) {
            map.removeControl(layerControl);
          }
          loadSectorsData(currentSectors);
        } else {
          removeClusterLayers();
          updateLegend('');
          if (layerControl) {
            layerControl.addTo(map);
          }
          if (clusterControl) {
            map.removeControl(clusterControl);
          }
        }
      });
    });

    // Add event listener for the 'Overall Stats' button
    L.DomEvent.on(div.querySelector('#overall-stats-button'), 'click', function (e) {
      L.DomEvent.stopPropagation(e); // Prevent event from bubbling up to the map
      showSectorStatistics(currentSectors);
    });

    return div;
  };
  sectorDiv.addTo(map);
}

function addPolygonToggleControl() {
  var polygonDiv = L.control({ position: 'topright' });
  polygonDiv.onAdd = function () {
    var div = L.DomUtil.create('div', 'polygon-toggle-control');
    var html = `
      <label>Display Mode:</label><br>
      <select id="display-mode-select">
        <option value="points" ${displayMode === 'points' ? 'selected' : ''}>Show Points Only</option>
        <option value="polygons" ${displayMode === 'polygons' ? 'selected' : ''}>Show Polygons Only</option>
        <option value="both" ${displayMode === 'both' ? 'selected' : ''}>Show Both</option>
      </select>
    `;
    div.innerHTML = html;
    return div;
  };
  polygonDiv.addTo(map);

  document.getElementById('display-mode-select').addEventListener('change', function () {
    displayMode = this.value; // Update global variable
    if (currentSectors.length > 0) {
      updateClusterLayers();
      updateLegend('Company Clusters'); // Update the legend
    }
  });
}

// Function to parse numbers and handle strings with commas or symbols
function parseNumber(value) {
  if (typeof value === 'string') {
    value = value.replace(/[^0-9.-]+/g, ''); // Remove non-numeric characters
  }
  var parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

function loadSectorsData(sectorsList) {
  var promises = sectorsList.map(function (sector) {
    var clusterFile = sectors[sector];
    var summaryFile = summaryStatsFiles[sector];
    var financialFile = financialDataFiles[sector];
    return new Promise(function (resolve, reject) {
      // Load the cluster data
      Papa.parse('data/' + clusterFile, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (clusterResults) {
          var clusterData = clusterResults.data.filter(function (company) {
            return company && company.Latitude && company.Longitude;
          });
          // Load the summary statistics data
          Papa.parse('data/' + summaryFile, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function (summaryResults) {
              // Load the financial data
              Papa.parse('data/' + financialFile, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function (financialResults) {
                  resolve({
                    sector: sector,
                    clusterData: clusterData,
                    summaryData: summaryResults.data,
                    financialData: financialResults.data
                  });
                },
                error: function (error) {
                  console.error('Error parsing financial CSV for sector ' + sector + ':', error);
                  resolve({
                    sector: sector,
                    clusterData: clusterData,
                    summaryData: summaryResults.data,
                    financialData: []
                  });
                }
              });
            },
            error: function (error) {
              console.error('Error parsing summary statistics CSV for sector ' + sector + ':', error);
              resolve({ sector: sector, clusterData: clusterData, summaryData: [], financialData: [] });
            }
          });
        },
        error: function (error) {
          console.error('Error parsing company clusters CSV for sector ' + sector + ':', error);
          resolve({ sector: sector, clusterData: [], summaryData: [], financialData: [] });
        }
      });
    });
  });

  Promise.all(promises).then(function (sectorDataArray) {
    companyData = [];
    clusterSummaryData = {}; // Holds cluster-level summary data

    sectorDataArray.forEach(function (sectorData) {
      var sector = sectorData.sector;
      var financialDataMap = {};

      // Create a mapping from Companynumber to financial data
      sectorData.financialData.forEach(function (financialRecord) {
        var companyNumber = financialRecord.Companynumber;
        financialDataMap[companyNumber] = financialRecord;
      });

      // Process cluster data and merge financial data
      sectorData.clusterData.forEach(function (company) {
        company.sector = sector;
        company.cluster = (company.cluster !== undefined && company.cluster !== null) ? company.cluster.toString() : '0';
        company.clusterId = sector + '_' + company.cluster;
      
        var companyNumber = company.Companynumber;
        var financialRecord = financialDataMap[companyNumber];
      
        if (financialRecord) {
          // Merge financial data into company object
          company.Companyname = financialRecord.Companyname;
          company.BestEstimateGrowthPercentagePerYear = parseFloat(financialRecord.BestEstimateGrowthPercentagePerYear);
          company.TotalInnovateUKFunding = parseFloat(financialRecord.TotalInnovateUKFunding);
          company.WomenFounded = parseInt(financialRecord.WomenFounded); // Parse as integer (0 or 1)
          company.total_employees = parseNumber(financialRecord.TotalEmployees);
          company.total_turnover = parseNumber(financialRecord.TotalTurnover);
        } else {
          // Handle companies without financial data
          company.Companyname = 'Unknown';
          company.BestEstimateGrowthPercentagePerYear = null;
          company.TotalInnovateUKFunding = null;
          company.WomenFounded = null;
          company.total_employees = 0;
          company.total_turnover = 0;
        }
      });

      companyData = companyData.concat(sectorData.clusterData);

      // Process summary data for clusters
      sectorData.summaryData.forEach(function (summary) {
        var clusterId = sector + '_' + summary.cluster.toString();
        clusterSummaryData[clusterId] = summary;
        clusterSummaryData[clusterId].sector = sector;
      });
    });

    generateClusterColors();
    populateClusterControl();
    currentClusters = getAllClusterIds();
    addCompanyClusters();
    updateLegend('Company Clusters');

    // Compute overall statistics for each sector
    computeSectorStatistics();

    // **Start of Master Dataset Generation**
    var masterDataset = [];

    for (var sector in sectorStats) {
      masterDataset.push({
        sector: sector,
        numberOfCompanies: sectorStats[sector].companyCount,
        totalEmployees: Math.round(sectorStats[sector].totalEmployees),
        totalTurnover: sectorStats[sector].totalTurnover, // Keep as number for CSV
        averageGrowthRate: sectorStats[sector].averageGrowthRate * 100, // Convert to percentage
        femaleFoundedPercentage: sectorStats[sector].femaleFoundedPercentage, // Keep as number
        totalIUKFunding: sectorStats[sector].totalIUKFunding, // Keep as number
        totalInvestment: sectorStats[sector].totalInvestment // Keep as number
      });
    }

    // **End of Master Dataset Generation**

    // **Start of CSV Generation and Download**
    
    // Function to convert array of objects to CSV
    function convertArrayOfObjectsToCSV(array) {
      if (array.length === 0) {
        return '';
      }

      const keys = Object.keys(array[0]);
      const csvRows = [];

      // Add header row
      csvRows.push(keys.join(','));

      // Add data rows
      array.forEach(obj => {
        const row = keys.map(key => {
          let value = obj[key];
          // If the value is a string containing commas or quotes, wrap it in quotes and escape existing quotes
          if (typeof value === 'string') {
            value = value.replace(/"/g, '""'); // Escape double quotes
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value}"`;
            }
          }
          return value;
        }).join(',');
        csvRows.push(row);
      });

      return csvRows.join('\n');
    }

    // Function to trigger CSV download
    function downloadCSV(csvContent, filename) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");

      if (navigator.msSaveBlob) { // For IE 10+
        navigator.msSaveBlob(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    // Generate CSV content
    const csvContent = convertArrayOfObjectsToCSV(masterDataset);

    // Trigger CSV download
    downloadCSV(csvContent, 'master_dataset.csv');

    // **End of CSV Generation and Download**
  });
}


function computeSectorStatistics() {
  // Initialize the sectorStats object
  sectorStats = {};

  companyData.forEach(function(company) {
    var sector = company.sector;
    if (!sectorStats[sector]) {
      sectorStats[sector] = {
        companyCount: 0,
        totalEmployees: 0,
        totalTurnover: 0,
        totalGrowthRate: 0,
        validGrowthRateCount: 0, // Ensure this line exists
        totalIUKFunding: 0,
        femaleFoundedCount: 0,
        totalInvestment: 0
      };
    }
    sectorStats[sector].companyCount += 1;

    // Aggregate statistics
    var growthRate = parseFloat(company.BestEstimateGrowthPercentagePerYear);
    if (!isNaN(growthRate)) {
      sectorStats[sector].totalGrowthRate += growthRate;
      sectorStats[sector].validGrowthRateCount += 1; // Increment if valid
    }

    var iukFunding = parseFloat(company.TotalInnovateUKFunding);
    sectorStats[sector].totalIUKFunding += isNaN(iukFunding) ? 0 : iukFunding;

    if (company.WomenFounded === 1) {
      sectorStats[sector].femaleFoundedCount += 1;
    }
  });

  // Integrate 'Total Employees', 'Total Turnover', and 'Total Investment' from clusterSummaryData
  for (var sector in sectorStats) {
    var totalEmployees = 0;
    var totalTurnover = 0;
    var companyCount = 0;

    for (var clusterId in clusterSummaryData) {
      if (clusterSummaryData[clusterId].sector === sector) {
        totalEmployees += parseFloat(clusterSummaryData[clusterId].total_employees) || 0;
        totalTurnover += parseFloat(clusterSummaryData[clusterId].total_turnover) || 0;
        companyCount += parseInt(clusterSummaryData[clusterId].companycount) || 0;

        // Aggregate 'total_Dealroom_PE' as 'Total Investment'
        var dealroomPE = parseFloat(clusterSummaryData[clusterId].total_Dealroom_PE);
        sectorStats[sector].totalInvestment += isNaN(dealroomPE) ? 0 : dealroomPE;
      }
    }

    sectorStats[sector].totalEmployees = totalEmployees;
    sectorStats[sector].totalTurnover = totalTurnover;

    // Calculate average growth rate and female-founded percentage
    var validGrowthRateCount = sectorStats[sector].validGrowthRateCount;
    sectorStats[sector].averageGrowthRate =
      validGrowthRateCount > 0 ? sectorStats[sector].totalGrowthRate / validGrowthRateCount : 0;
    sectorStats[sector].femaleFoundedPercentage =
      sectorStats[sector].companyCount > 0
        ? (sectorStats[sector].femaleFoundedCount / sectorStats[sector].companyCount) * 100
        : 0;
  }
}

function showSectorStatistics(selectedSectors) {
  var content =
    '<button id="info-box-close" class="info-box-close">&times;</button>';

  selectedSectors.forEach(function (sector) {
    var stats = sectorStats[sector];
    if (stats) {
      content += `
        <h3>${sector} - Overall Statistics</h3>
        <p><strong>Number of Companies:</strong> ${stats.companyCount}</p>
        <p><strong>Total Employees:</strong> ${Math.round(stats.totalEmployees)}</p>
        <p><strong>Total Turnover:</strong> ${formatTurnover(stats.totalTurnover)}</p>
        <p><strong>Average Growth Rate:</strong> ${(stats.averageGrowthRate * 100).toFixed(2)}%</p> <!-- Updated Line -->
        <p><strong>% Female-Founded Companies:</strong> ${stats.femaleFoundedPercentage.toFixed(2)}%</p>
        <p><strong>Total IUK Grant Funding:</strong> ${formatTurnover(stats.totalIUKFunding)}</p>
        <p><strong>Total Investment:</strong> ${formatTurnover(stats.totalInvestment)}</p>
      `;
    } else {
      content += `<p>No statistics available for sector: ${sector}</p>`;
    }
  });

  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.innerHTML = content;
    infoBox.classList.remove('hidden');

    // Disable click events from propagating to the map
    L.DomEvent.disableClickPropagation(infoBox);

    // Add event listener for close button
    var closeButton = document.getElementById('info-box-close');
    if (closeButton) {
      closeButton.addEventListener('click', function (e) {
        infoBox.classList.add('hidden');
        e.stopPropagation(); // Prevent the click from propagating to the map
      });
    } else {
      console.error('Close button not found in info box');
    }
  } else {
    console.error('Info box element not found');
  }
}


function removeClusterLayers() {
  for (var clusterId in clusterLayers) {
    map.removeLayer(clusterLayers[clusterId]);
  }
  clusterLayers = {};
  clusterColors = {};
  currentClusters = [];
  if (clusterControl) {
    map.removeControl(clusterControl);
  }
  // Remove sector polygons
  for (var sector in sectorPolygonLayers) {
    map.removeLayer(sectorPolygonLayers[sector]);
  }
  sectorPolygonLayers = {};
}

function removeOtherLayers() {
  if (localAuthoritiesLayer && map.hasLayer(localAuthoritiesLayer)) map.removeLayer(localAuthoritiesLayer);
  if (finalAreasLayer && map.hasLayer(finalAreasLayer)) map.removeLayer(finalAreasLayer);
  for (var key in scaleupLayers) {
    if (map.hasLayer(scaleupLayers[key])) map.removeLayer(scaleupLayers[key]);
  }
  if (searchControl) {
    map.removeControl(searchControl);
  }
}

function addCompanyClusters() {
  updateClusterLayers();
}

function updateClusterLayers() {
  // Remove existing cluster layers
  for (var clusterId in clusterLayers) {
    map.removeLayer(clusterLayers[clusterId]);
  }
  clusterLayers = {};

  if (currentSectors.length === 0) {
    return; // No sectors selected
  }

  var clusters = {};
  companyData.forEach(function (company) {
    var clusterId = company.clusterId;
    if (currentClusters.includes(clusterId)) {
      if (!clusters[clusterId]) {
        clusters[clusterId] = [];
      }
      clusters[clusterId].push(company);
    }
  });

  var numberOfSelectedSectors = currentSectors.length;

  for (var clusterId in clusters) {
    var clusterGroup = L.layerGroup();
    var points = [];

    // Initialize aggregation variables
    var totalGrowthRate = 0;
    var growthRateCount = 0;
    var totalIUKFunding = 0;
    var femaleFoundedCount = 0;
    var totalEmployees = 0;
    var totalTurnover = 0;

    clusters[clusterId].forEach(function (company) {
      var lat = company.Latitude;
      var lng = company.Longitude;
      var companyNumber = company.Companynumber;

      // Collect points for polygon creation
      points.push([lat, lng]);

      // Collect data for aggregation
      var growthRate = company.BestEstimateGrowthPercentagePerYear;
      if (typeof growthRate === 'number' && !isNaN(growthRate)) {
        totalGrowthRate += growthRate;
        growthRateCount++;
      }

      var iukFunding = company.TotalInnovateUKFunding;
      if (typeof iukFunding === 'number' && !isNaN(iukFunding)) {
        totalIUKFunding += iukFunding;
      }

      // Count female-founded companies
      if (company.WomenFounded === 1) {
        femaleFoundedCount++;
      }

      // Show markers if displayMode is 'points' or 'both'
      if (displayMode === 'points' || displayMode === 'both') {
        var marker = L.circleMarker([lat, lng], {
          pane: 'markerPane', // Ensure markers are on top
          radius: 3,
          fillColor: getClusterColor(clusterId),
          color: '#000',
          weight: 0.2,
          fillOpacity: 0.8
        });

        // Update marker popup content to include company name
        marker.bindPopup(`
          <div class="popup-content">
            <p><strong>Company Name:</strong> ${company.Companyname}</p>
            <p><strong>Company Number:</strong> ${companyNumber}</p>
            <p><strong>Cluster:</strong> ${company.Cluster_name} (Cluster ${company.cluster})</p>
            <p><strong>Sector:</strong> ${company.sector}</p>
          </div>
        `);

        marker.on({
          mouseover: function (e) {
            var layer = e.target;
            layer.setStyle({
              radius: 5,
              weight: 1,
              color: '#fff',
              fillOpacity: 1
            });
          },
          mouseout: function (e) {
            var layer = e.target;
            layer.setStyle({
              radius: 3,
              weight: 0.2,
              color: '#000',
              fillOpacity: 0.8
            });
          },
          click: function (e) {
            e.target.openPopup();
          }
        });

        clusterGroup.addLayer(marker);
      }
    });

    var clusterNumber = clusters[clusterId][0].cluster;
    var sectorName = clusters[clusterId][0].sector;
    var clusterName = clusters[clusterId][0].Cluster_name;

    // Determine polygon color based on sector
    var polygonColor;
    if (clusterNumber === '0') {
      polygonColor = '#D3D3D3'; // Light grey for Cluster 0
    } else {
      polygonColor = sectorColors[sectorName] || '#FFFFFF';
    }

    // Create polygon if displayMode is 'polygons' or 'both', cluster is not '0', and points length >= 3
    if ((displayMode === 'polygons' || displayMode === 'both') && clusterNumber !== '0' && points.length >= 3) {
      var polygon = L.polygon(convexHull(points), {
        pane: 'polygonsPane',
        color: polygonColor,
        fillColor: polygonColor,
        fillOpacity: 0.2,
        weight: 1,
        interactive: true
      });

      // Retrieve summary data for this cluster
      var summary = clusterSummaryData[clusterId];

      // Calculate aggregated statistics
      var averageGrowthRate = growthRateCount > 0 ? (totalGrowthRate / growthRateCount) : null;
      var femaleFoundedPercentage = clusters[clusterId].length > 0 ? (femaleFoundedCount / clusters[clusterId].length) * 100 : null;

      // Prepare summary info
      var companyCount = summary ? summary.companycount : clusters[clusterId].length;
      var totalEmployees = summary ? Math.round(summary.total_employees) : 'N/A';
      var totalTurnover = summary ? formatTurnover(summary.total_turnover) : 'N/A';
      var averageGrowthRateDisplay = averageGrowthRate !== null ? averageGrowthRate.toFixed(1) + '%' : 'N/A';
      var femaleFoundedPercentageDisplay = femaleFoundedPercentage !== null ? femaleFoundedPercentage.toFixed(1) + '%' : 'N/A';
      var totalIUKFundingDisplay = totalIUKFunding > 0 ? formatTurnover(totalIUKFunding) : 'N/A';

      // Update polygon popup content to include new aggregated data
      polygon.bindPopup(`
        <div class="popup-content">
          <p><strong>Cluster:</strong> ${clusterName} (Cluster ${clusterNumber})</p>
          <p><strong>Sector:</strong> ${sectorName}</p>
          <p><strong>Company Count:</strong> ${companyCount}</p>
          <p><strong>Total Employees:</strong> ${totalEmployees}</p>
          <p><strong>Total Turnover:</strong> ${totalTurnover}</p>
          <p><strong>Average Growth Rate:</strong> ${averageGrowthRateDisplay}</p>
          <p><strong>% Female-Founded Companies:</strong> ${femaleFoundedPercentageDisplay}</p>
          <p><strong>Total IUK Grant Funding:</strong> ${totalIUKFundingDisplay}</p>
        </div>
      `);

      polygon.on({
        mouseover: function (e) {
          e.target.setStyle({
            weight: 2,
            color: '#666',
            fillOpacity: 0.3
          });
          e.target.bringToFront();
        },
        mouseout: function (e) {
          e.target.setStyle({
            weight: 1,
            color: polygonColor,
            fillOpacity: 0.2
          });
        },
        click: function (e) {
          // Update the info box instead of opening a popup
          showClusterInfo({
            clusterName: clusterName,
            clusterNumber: clusterNumber,
            sectorName: sectorName,
            companyCount: companyCount,
            totalEmployees: totalEmployees,
            totalTurnover: totalTurnover,
            averageGrowthRateDisplay: averageGrowthRateDisplay,
            femaleFoundedPercentageDisplay: femaleFoundedPercentageDisplay,
            totalIUKFundingDisplay: totalIUKFundingDisplay
          });
        }
      });

      clusterGroup.addLayer(polygon);
    }

    clusterLayers[clusterId] = clusterGroup;
    clusterGroup.addTo(map);
  }
}


function showClusterInfo(info) {
  var infoBox = document.getElementById('info-box');
  
  if (!infoBox) {
    console.error('Info box element not found');
    return;
  }

  infoBox.innerHTML = `
    <button id="info-box-close" class="info-box-close">&times;</button>
    <h3>${info.clusterName} (Cluster ${info.clusterNumber})</h3>
    <p><strong>Sector:</strong> ${info.sectorName}</p>
    <p><strong>Company Count:</strong> ${info.companyCount}</p>
    <p><strong>Total Employees:</strong> ${info.totalEmployees}</p>
    <p><strong>Total Turnover:</strong> ${info.totalTurnover}</p>
    <p><strong>Average Growth Rate:</strong> ${info.averageGrowthRateDisplay}</p>
    <p><strong>% Female-Founded Companies:</strong> ${info.femaleFoundedPercentageDisplay}</p>
    <p><strong>Total IUK Grant Funding:</strong> ${info.totalIUKFundingDisplay}</p>
  `;
  
  infoBox.classList.remove('hidden');

  // Add event listener for close button
  var closeButton = document.getElementById('info-box-close');
  if (!closeButton) {
    console.error('Close button not found');
  } else {
    closeButton.addEventListener('click', function() {
      infoBox.classList.add('hidden');
    });
  }
}

function generateClusterColors() {
  clusterColors = {}; // Reset cluster colors

  var clustersInSelectedSectors = companyData.filter(function (company) {
    return currentSectors.includes(company.sector);
  });

  var uniqueClusters = {};

  clustersInSelectedSectors.forEach(function (company) {
    var clusterId = company.clusterId;
    var clusterNumber = company.cluster;

    if (clusterNumber === '0') {
      clusterColors[clusterId] = '#D3D3D3'; // Light grey for Cluster 0
    } else if (!uniqueClusters[clusterId]) {
      uniqueClusters[clusterId] = true;
    }
  });

  var clusterIds = Object.keys(uniqueClusters);
  var numClusters = clusterIds.length;
  var colorScale = chroma.scale('Set1').colors(numClusters);

  clusterIds.forEach(function (clusterId, index) {
    clusterColors[clusterId] = colorScale[index];
  });
}

function getAllClusterIds() {
  var clusterIds = companyData.reduce(function (acc, company) {
    var clusterId = company.clusterId;
    if (!acc.includes(clusterId)) {
      acc.push(clusterId);
    }
    return acc;
  }, []);
  return clusterIds;
}

function populateClusterControl() {
  var clusterIds = getAllClusterIds();

  // Create a mapping of sectors to clusters
  var sectorClusters = {};
  companyData.forEach(function (company) {
    if (!sectorClusters[company.sector]) {
      sectorClusters[company.sector] = [];
    }
    sectorClusters[company.sector].push({
      clusterNumber: company.cluster,
      clusterId: company.clusterId,
      clusterName: company.Cluster_name
    });
  });

  // Remove duplicates in sectorClusters
  for (var sector in sectorClusters) {
    sectorClusters[sector] = sectorClusters[sector].filter((v, i, a) => a.findIndex(t => (t.clusterId === v.clusterId)) === i);
  }

  clusterControl = L.control({ position: 'topright' });
  clusterControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'cluster-control');
    var html = '<label>Select Clusters:</label><br>';
    html += '<button id="select-all-clusters">Select All</button>';
    html += '<button id="deselect-all-clusters">Deselect All</button><br>';
    html += '<div id="cluster-checkboxes">';

    for (var sector in sectorClusters) {
      html += '<div class="sector-section">';
      html += '<div class="sector-header">' + sector + '</div>';
      html += '<div class="sector-clusters">';
      sectorClusters[sector].forEach(function (clusterInfo) {
        var clusterId = clusterInfo.clusterId;
        var clusterLabel = clusterInfo.clusterName + ' (Cluster ' + clusterInfo.clusterNumber + ')';
        html += '<input type="checkbox" class="cluster-checkbox" data-clusterid="' + clusterId + '" checked> ' + clusterLabel + '<br>';
      });
      html += '</div></div>';
    }
    html += '</div>';
    div.innerHTML = html;
    return div;
  };
  clusterControl.addTo(map);

  // Add event listeners for the sector headers to toggle visibility
  document.querySelectorAll('.sector-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var clustersDiv = this.nextElementSibling;
      clustersDiv.style.display = clustersDiv.style.display === 'none' ? 'block' : 'none';
    });
  });

  document.getElementById('deselect-all-clusters').addEventListener('click', function () {
    var checkboxes = document.querySelectorAll('.cluster-checkbox');
    checkboxes.forEach(function (checkbox) {
      checkbox.checked = false;
    });
    currentClusters = [];
    updateClusterLayers();
  });

  var checkboxes = document.querySelectorAll('.cluster-checkbox');
  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      currentClusters = Array.from(document.querySelectorAll('.cluster-checkbox:checked')).map(function (cb) {
        return cb.getAttribute('data-clusterid');
      });
      updateClusterLayers();
    });
  });
}

function convexHull(points) {
  if (points.length < 3) {
    return points;
  }
  points = points.slice().sort(function (a, b) {
    return a[0] - b[0] || a[1] - b[1];
  });

  var lower = [];
  for (var i = 0; i < points.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
      lower.pop();
    }
    lower.push(points[i]);
  }

  var upper = [];
  for (var i = points.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
      upper.pop();
    }
    upper.push(points[i]);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
  
// Create a custom Leaflet control for downloading the map
L.Control.DownloadMap = L.Control.extend({
  options: {
    position: 'topright' // Position of the control
  },

  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-download');

    container.innerHTML = 'Download Map';
    container.title = 'Download Current Map View';

    // Prevent click events from propagating to the map
    L.DomEvent.disableClickPropagation(container);

    container.onclick = function () {
      downloadMap();
    };

    return container;
  }
});

// Add the Download Map control to the map
map.addControl(new L.Control.DownloadMap());

function downloadMap() {
  // Check if UK Boundary layer is active
  if (!map.hasLayer(ukBoundaryLayer)) {
    alert('Please enable the UK Boundary layer before downloading the map.');
    return;
  }

  // Check if any cluster layers are selected
  if (currentClusters.length === 0) {
    alert('Please select at least one cluster to include in the download.');
    return;
  }

  // Hide the base tile layer
  map.removeLayer(baseTileLayer);

  // Hide other layers except UK Boundary and selected cluster layers
  if (localAuthoritiesLayer && map.hasLayer(localAuthoritiesLayer)) {
    map.removeLayer(localAuthoritiesLayer);
  }

  // Retain Final Areas Layer
  // Remove the following lines to keep Final Areas visible
  /*
  if (finalAreasLayer && map.hasLayer(finalAreasLayer)) {
    map.removeLayer(finalAreasLayer);
  }
  */

  // Retain Scaleup Layers
  // Remove the following lines to keep Scaleup layers visible
  /*
  for (var key in scaleupLayers) {
    if (scaleupLayers[key] && map.hasLayer(scaleupLayers[key])) {
      map.removeLayer(scaleupLayers[key]);
    }
  }
  */

  // Ensure UK Boundary layer is visible
  if (ukBoundaryLayer && !map.hasLayer(ukBoundaryLayer)) {
    map.addLayer(ukBoundaryLayer);
  }

  // Ensure selected cluster layers are visible
  for (var clusterId in clusterLayers) {
    if (currentClusters.includes(clusterId)) {
      if (clusterLayers[clusterId] && !map.hasLayer(clusterLayers[clusterId])) {
        map.addLayer(clusterLayers[clusterId]);
      }
    }
  }

  // Add a short delay to ensure layers are rendered
  setTimeout(function() {
    html2canvas(document.getElementById('map'), { backgroundColor: null }).then(function(canvas) {
      // Convert canvas to data URL
      var dataURL = canvas.toDataURL('image/png');

      // Create a link element for download
      var link = document.createElement('a');
      link.href = dataURL;
      link.download = 'map.png';

      // Simulate a click on the link to trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Restore the base tile layer and other layers
      map.addLayer(baseTileLayer);

      if (localAuthoritiesLayer && !map.hasLayer(localAuthoritiesLayer)) {
        map.addLayer(localAuthoritiesLayer);
      }

      // Restore Final Areas Layer if it was previously removed
      /*
      if (finalAreasLayer && !map.hasLayer(finalAreasLayer)) {
        map.addLayer(finalAreasLayer);
      }
      */

      // Restore Scaleup Layers if they were previously removed
      /*
      for (var key in scaleupLayers) {
        if (scaleupLayers[key] && !map.hasLayer(scaleupLayers[key])) {
          map.addLayer(scaleupLayers[key]);
        }
      }
      */
    }).catch(function(err) {
      console.error('Error capturing the map with html2canvas:', err);

      // Restore the base tile layer and other layers in case of error
      map.addLayer(baseTileLayer);

      if (localAuthoritiesLayer && !map.hasLayer(localAuthoritiesLayer)) {
        map.addLayer(localAuthoritiesLayer);
      }

      // Restore Final Areas Layer if it was previously removed
      /*
      if (finalAreasLayer && !map.hasLayer(finalAreasLayer)) {
        map.addLayer(finalAreasLayer);
      }
      */

      // Restore Scaleup Layers if they were previously removed
      /*
      for (var key in scaleupLayers) {
        if (scaleupLayers[key] && !map.hasLayer(scaleupLayers[key])) {
          map.addLayer(scaleupLayers[key]);
        }
      }
      */
    });
  }, 500); // 500ms delay to ensure layers are rendered
}